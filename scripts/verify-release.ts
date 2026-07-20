import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { unzipSync } from "fflate";

const projectRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(projectRoot, "dist");
const releaseRoot = resolve(projectRoot, "release");
const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")) as {
  version: string;
};
const baseName = `FloatRead-v${packageJson.version}`;
const zipPath = resolve(releaseRoot, `${baseName}.zip`);

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return files.flat();
}

const zipBytes = await readFile(zipPath);
const archive = unzipSync(zipBytes);
const archiveNames = Object.keys(archive).sort();
const distFiles = await listFiles(distRoot);
const distNames = distFiles.map((path) => relative(distRoot, path).replaceAll("\\", "/")).sort();

if (JSON.stringify(archiveNames) !== JSON.stringify(distNames)) {
  throw new Error("release ZIP file list does not exactly match dist");
}

function requireEntry(name: string): Uint8Array {
  const data = archive[name];
  if (!data) {
    throw new Error(`missing release entry: ${name}`);
  }
  return data;
}

for (const name of archiveNames) {
  if (
    name.startsWith("/") ||
    name.includes("..") ||
    name.includes(".env") ||
    name.includes(".secrets") ||
    name.includes("node_modules") ||
    name.includes("test") ||
    name.endsWith(".map") ||
    name.endsWith(".log")
  ) {
    throw new Error(`forbidden release entry: ${name}`);
  }
  const data = requireEntry(name);
  if (data.byteLength === 0) {
    throw new Error(`empty release entry: ${name}`);
  }
  const distBytes = await readFile(resolve(distRoot, name));
  if (!Buffer.from(data).equals(distBytes)) {
    throw new Error(`release entry differs from dist: ${name}`);
  }
}

const manifest = JSON.parse(new TextDecoder().decode(requireEntry("manifest.json"))) as {
  version: string;
};
if (manifest.version !== packageJson.version) {
  throw new Error(`version mismatch: package ${packageJson.version}, manifest ${manifest.version}`);
}

const digest = createHash("sha256").update(zipBytes).digest("hex");
const inventory = archiveNames
  .map((name) => `${name}\t${requireEntry(name).byteLength} bytes`)
  .join("\n");
await writeFile(resolve(releaseRoot, `${baseName}-files.txt`), `${inventory}\n`, "utf8");
await writeFile(resolve(releaseRoot, `${baseName}.sha256`), `${digest}  ${baseName}.zip\n`, "utf8");

console.log(
  `Verified ${archiveNames.length} ZIP entries; ${await stat(zipPath).then((value) => value.size)} bytes; SHA-256 ${digest}.`,
);
