import { openDB, type DBSchema } from "idb";
import { z } from "zod";
import { BUILTIN_SKINS, getBuiltinSkin } from "./builtins";
import { skinManifestV1Schema } from "./schema";
import type {
  InstalledSkin,
  RuntimeSkinDefinition,
  SkinPackageManifestV1,
  SkinState,
} from "./types";
import type { ValidatedSkinPackage } from "./package-validator";

const INSTALLED_SKINS_KEY = "installedSkinsV1";
const COMMUNITY_CAPACITY = 25_000_000;

const installedSkinSchema = z
  .object({
    manifest: skinManifestV1Schema,
    installedAt: z.number().int().nonnegative(),
    totalBytes: z.number().int().positive().max(5_000_000),
  })
  .strict();
const installedSkinsSchema = z.array(installedSkinSchema).max(50);

interface SkinAssetRecord {
  key: string;
  skinId: string;
  path: string;
  mime: "image/png" | "image/webp";
  bytes: ArrayBuffer;
}

interface SkinAssetsDb extends DBSchema {
  assets: {
    key: string;
    value: SkinAssetRecord;
    indexes: { "by-skin": string };
  };
}

let assetsDbPromise: ReturnType<typeof openDB<SkinAssetsDb>> | undefined;

function getAssetsDb(): ReturnType<typeof openDB<SkinAssetsDb>> {
  assetsDbPromise ??= openDB<SkinAssetsDb>("floatread-skin-assets", 1, {
    upgrade(db) {
      const store = db.createObjectStore("assets", { keyPath: "key" });
      store.createIndex("by-skin", "skinId");
    },
  });
  return assetsDbPromise;
}

export async function listInstalledSkins(): Promise<InstalledSkin[]> {
  const stored = await chrome.storage.local.get(INSTALLED_SKINS_KEY);
  const parsed = installedSkinsSchema.safeParse(stored[INSTALLED_SKINS_KEY]);
  return parsed.success ? parsed.data : [];
}

export async function listRuntimeSkins(): Promise<RuntimeSkinDefinition[]> {
  const community = (await listInstalledSkins()).map(toRuntimeSkin);
  return [...BUILTIN_SKINS, ...community];
}

function toRuntimeSkin(installed: InstalledSkin): RuntimeSkinDefinition {
  const states: SkinState[] = ["idle", "ready", "thinking", "success", "error"];
  return {
    schemaVersion: 1,
    id: installed.manifest.id,
    name: installed.manifest.name,
    source: "community",
    variant: "community",
    motions: installed.manifest.motions,
    panel: installed.manifest.panel,
    availableAssets: states.filter(
      (state) => installed.manifest.assets[state] !== undefined || state === "idle",
    ),
  };
}

export async function getRuntimeSkin(id: string): Promise<RuntimeSkinDefinition> {
  const builtin = getBuiltinSkin(id);
  if (builtin) return builtin;
  const installed = (await listInstalledSkins()).find((skin) => skin.manifest.id === id);
  return installed ? toRuntimeSkin(installed) : (getBuiltinSkin("mochi") as RuntimeSkinDefinition);
}

export async function installSkinPackage(pkg: ValidatedSkinPackage): Promise<void> {
  if (getBuiltinSkin(pkg.manifest.id)) throw new Error("皮肤 ID 与内置皮肤冲突。");
  const installed = await listInstalledSkins();
  const existing = installed.find((skin) => skin.manifest.id === pkg.manifest.id);
  const usedBytes =
    installed.reduce((sum, skin) => sum + skin.totalBytes, 0) - (existing?.totalBytes ?? 0);
  if (usedBytes + pkg.totalBytes > COMMUNITY_CAPACITY) {
    throw new Error("社区皮肤总容量不能超过 25 MB。");
  }
  const db = await getAssetsDb();
  const transaction = db.transaction("assets", "readwrite");
  let cursor = await transaction.store.index("by-skin").openCursor(pkg.manifest.id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  for (const asset of pkg.assets) {
    const bytes = new Uint8Array(asset.bytes).buffer;
    await transaction.store.put({
      key: `${pkg.manifest.id}:${asset.path}`,
      skinId: pkg.manifest.id,
      path: asset.path,
      mime: asset.mime,
      bytes,
    });
  }
  await transaction.done;
  const record: InstalledSkin = {
    manifest: pkg.manifest,
    installedAt: Date.now(),
    totalBytes: pkg.totalBytes,
  };
  await chrome.storage.local.set({
    [INSTALLED_SKINS_KEY]: [
      ...installed.filter((skin) => skin.manifest.id !== pkg.manifest.id),
      record,
    ],
  });
}

export async function deleteInstalledSkin(id: string): Promise<void> {
  const installed = await listInstalledSkins();
  await chrome.storage.local.set({
    [INSTALLED_SKINS_KEY]: installed.filter((skin) => skin.manifest.id !== id),
  });
  const db = await getAssetsDb();
  const transaction = db.transaction("assets", "readwrite");
  let cursor = await transaction.store.index("by-skin").openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await transaction.done;
}

export async function getInstalledSkinManifest(id: string): Promise<SkinPackageManifestV1 | null> {
  return (await listInstalledSkins()).find((skin) => skin.manifest.id === id)?.manifest ?? null;
}

export async function getSkinAsset(
  skinId: string,
  path: string,
): Promise<SkinAssetRecord | undefined> {
  return (await getAssetsDb()).get("assets", `${skinId}:${path}`);
}

export async function getSkinStateAsset(
  skinId: string,
  state: SkinState,
): Promise<SkinAssetRecord | undefined> {
  const manifest = await getInstalledSkinManifest(skinId);
  if (!manifest) return undefined;
  const path = manifest.assets[state] ?? manifest.assets.idle;
  return getSkinAsset(skinId, path);
}

export async function getAllSkinAssets(skinId: string): Promise<SkinAssetRecord[]> {
  return (await getAssetsDb()).getAllFromIndex("assets", "by-skin", skinId);
}
