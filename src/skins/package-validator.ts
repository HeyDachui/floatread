import { unzipSync } from "fflate";
import { migrateSkinManifest } from "./schema";
import type { SkinPackageManifestV1 } from "./types";

const MAX_PACKAGE_BYTES = 5_000_000;
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_FILES = 12;
const MAX_TOTAL_UNCOMPRESSED = 5_000_000;

export class SkinImportError extends Error {
  public readonly code: string;
  public readonly fileName: string | undefined;

  public constructor(code: string, message: string, fileName?: string) {
    super(message);
    this.name = "SkinImportError";
    this.code = code;
    this.fileName = fileName;
  }
}

export interface ValidatedSkinAsset {
  path: string;
  mime: "image/png" | "image/webp";
  bytes: Uint8Array;
  width: number;
  height: number;
}

export interface ValidatedSkinPackage {
  manifest: SkinPackageManifestV1;
  assets: ValidatedSkinAsset[];
  totalBytes: number;
}

interface ZipEntryMetadata {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
}

function unsafePath(name: string): boolean {
  return (
    name.includes("\\") ||
    name.startsWith("/") ||
    /^(?:[a-z]:)/iu.test(name) ||
    /(?:^|\/)\.\.(?:\/|$)/u.test(name) ||
    name.includes("\0")
  );
}

export function inspectZipCentralDirectory(bytes: Uint8Array): ZipEntryMetadata[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries: ZipEntryMetadata[] = [];
  const names = new Set<string>();
  let eocdOffset = -1;
  for (
    let offset = bytes.byteLength - 22;
    offset >= Math.max(0, bytes.byteLength - 65_557);
    offset -= 1
  ) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new SkinImportError("ZIP_INVALID", "未找到 ZIP 文件目录。");
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralSize = view.getUint32(eocdOffset + 12, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new SkinImportError("ZIP64_UNSUPPORTED", "皮肤包不支持 ZIP64。");
  }
  if (centralOffset + centralSize > eocdOffset || entryCount === 0) {
    throw new SkinImportError("ZIP_INVALID", "ZIP 中央目录范围无效。");
  }
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014b50) {
      throw new SkinImportError("ZIP_INVALID", "皮肤包目录结构损坏。");
    }
    const flags = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.byteLength) {
      throw new SkinImportError("ZIP_INVALID", "皮肤包目录结构损坏。");
    }
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if ((flags & 0x1) !== 0) {
      throw new SkinImportError("ZIP_ENCRYPTED", "不支持加密皮肤包。", name);
    }
    if (unsafePath(name)) {
      throw new SkinImportError("PATH_TRAVERSAL", "资源路径不安全。", name);
    }
    if (names.has(name)) {
      throw new SkinImportError("DUPLICATE_FILE", "皮肤包包含重复文件。", name);
    }
    names.add(name);
    entries.push({ name, compressedSize, uncompressedSize });
    offset = end;
  }
  if (offset !== centralOffset + centralSize) {
    throw new SkinImportError("ZIP_INVALID", "ZIP 目录大小不匹配。");
  }
  if (entries.length > MAX_FILES) {
    throw new SkinImportError("TOO_MANY_FILES", `皮肤包最多允许 ${MAX_FILES} 个文件。`);
  }
  const total = entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
  if (total > MAX_TOTAL_UNCOMPRESSED) {
    throw new SkinImportError("ZIP_BOMB", "皮肤包解压后超过 5 MB。");
  }
  for (const entry of entries) {
    if (
      entry.uncompressedSize > 200_000 &&
      entry.compressedSize > 0 &&
      entry.uncompressedSize / entry.compressedSize > 100
    ) {
      throw new SkinImportError("ZIP_BOMB", "文件压缩比异常，已拒绝导入。", entry.name);
    }
  }
  return entries;
}

function imageMime(path: string, bytes: Uint8Array): "image/png" | "image/webp" {
  if (/\.png$/iu.test(path)) {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (signature.every((byte, index) => bytes[index] === byte)) return "image/png";
    throw new SkinImportError("MIME_MISMATCH", "PNG 文件签名无效。", path);
  }
  if (/\.webp$/iu.test(path)) {
    const riff = new TextDecoder().decode(bytes.subarray(0, 4));
    const webp = new TextDecoder().decode(bytes.subarray(8, 12));
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
    throw new SkinImportError("MIME_MISMATCH", "WebP 文件签名无效。", path);
  }
  throw new SkinImportError("FILE_TYPE", "只允许 JSON、PNG 和 WebP。", path);
}

async function browserImageDimensions(
  bytes: Uint8Array,
  mime: "image/png" | "image/webp",
): Promise<{ width: number; height: number }> {
  const copy = new Uint8Array(bytes).buffer;
  const bitmap = await createImageBitmap(new Blob([copy], { type: mime }));
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export async function validateSkinPackage(
  packageBytes: Uint8Array,
  decodeDimensions: (
    bytes: Uint8Array,
    mime: "image/png" | "image/webp",
  ) => Promise<{ width: number; height: number }> = browserImageDimensions,
): Promise<ValidatedSkinPackage> {
  if (packageBytes.byteLength > MAX_PACKAGE_BYTES) {
    throw new SkinImportError("PACKAGE_TOO_LARGE", "皮肤包不能超过 5 MB。");
  }
  const metadata = inspectZipCentralDirectory(packageBytes);
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(packageBytes);
  } catch {
    throw new SkinImportError("ZIP_INVALID", "皮肤包无法安全解压。");
  }
  const fileNames = metadata
    .filter((entry) => !entry.name.endsWith("/"))
    .map((entry) => entry.name);
  if (!fileNames.includes("skin.json")) {
    throw new SkinImportError("MANIFEST_MISSING", "皮肤包缺少 skin.json。");
  }
  for (const name of fileNames) {
    if (name !== "skin.json" && !/\.(?:png|webp)$/iu.test(name)) {
      throw new SkinImportError("FILE_TYPE", "只允许 JSON、PNG 和 WebP。", name);
    }
  }
  const manifestFile = zip["skin.json"];
  if (!manifestFile) throw new SkinImportError("MANIFEST_MISSING", "皮肤包缺少 skin.json。");
  const manifestBytes = manifestFile;
  if (manifestBytes.byteLength > 100_000) {
    throw new SkinImportError("MANIFEST_TOO_LARGE", "skin.json 不能超过 100 KB。", "skin.json");
  }
  let rawManifest: unknown;
  try {
    rawManifest = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes));
  } catch {
    throw new SkinImportError("MANIFEST_JSON", "skin.json 不是有效的 UTF-8 JSON。", "skin.json");
  }
  const manifest = migrateSkinManifest(rawManifest);
  if (!manifest) {
    throw new SkinImportError(
      "MANIFEST_SCHEMA",
      "skin.json 字段、版本或数值不符合规范。",
      "skin.json",
    );
  }
  const referenced = new Set(
    Object.values(manifest.assets).filter((value): value is string => !!value),
  );
  for (const path of referenced) {
    if (!fileNames.includes(path)) {
      throw new SkinImportError("ASSET_MISSING", "skin.json 引用的资源不存在。", path);
    }
  }
  for (const name of fileNames) {
    if (name !== "skin.json" && !referenced.has(name)) {
      throw new SkinImportError("UNREFERENCED_FILE", "皮肤包包含未声明文件。", name);
    }
  }

  const assets: ValidatedSkinAsset[] = [];
  for (const path of referenced) {
    const file = zip[path];
    if (!file) throw new SkinImportError("ASSET_MISSING", "资源不存在。", path);
    const bytes = file;
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new SkinImportError("IMAGE_TOO_LARGE", "单张图片不能超过 1.5 MB。", path);
    }
    const mime = imageMime(path, bytes);
    let dimensions: { width: number; height: number };
    try {
      dimensions = await decodeDimensions(bytes, mime);
    } catch {
      throw new SkinImportError("IMAGE_DECODE", "图片无法安全解码。", path);
    }
    if (
      dimensions.width < 32 ||
      dimensions.height < 32 ||
      dimensions.width > 512 ||
      dimensions.height > 512
    ) {
      throw new SkinImportError("IMAGE_DIMENSIONS", "图片尺寸必须在 32×32 到 512×512 之间。", path);
    }
    assets.push({ path, mime, bytes, ...dimensions });
  }
  return {
    manifest,
    assets,
    totalBytes:
      manifestBytes.byteLength + assets.reduce((sum, asset) => sum + asset.bytes.byteLength, 0),
  };
}
