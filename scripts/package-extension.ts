import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { zipSync } from "fflate";

const projectRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(projectRoot, "dist");
const releaseRoot = resolve(projectRoot, "release");
const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")) as {
  version: string;
};
const outputPath = resolve(releaseRoot, `FloatRead-v${packageJson.version}.zip`);
const reproducibleMtime = new Date("2000-01-01T00:00:00.000Z");
const releaseNotice = [
  "FloatRead（锤子点读机）",
  "",
  "License: PolyForm Noncommercial License 1.0.0",
  "https://polyformproject.org/licenses/noncommercial/1.0.0",
  "",
  "Required Notice: Copyright 2026 FloatRead Contributors. FloatRead（锤子点读机）is free to use, study, modify, and share only for noncommercial purposes. Commercial use requires separate permission from the maintainer.",
  "",
  "The source code, full license text, and commercial-use explanation are available at:",
  "https://github.com/HeyDachui/floatread",
].join("\n");

async function addDirectory(files: Record<string, Uint8Array>, directory: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await addDirectory(files, path);
      continue;
    }
    const archivePath = relative(distRoot, path).replaceAll("\\", "/");
    files[archivePath] = await readFile(path);
  }
}

await mkdir(releaseRoot, { recursive: true });
await rm(outputPath, { force: true });
const files: Record<string, Uint8Array> = {};
await addDirectory(files, distRoot);
files["NOTICE.txt"] = new TextEncoder().encode(releaseNotice);
const data = zipSync(files, { level: 9, mtime: reproducibleMtime });
await writeFile(outputPath, data);
console.log(`${outputPath} (${(await stat(outputPath)).size} bytes)`);
