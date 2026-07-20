import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import JSZip from "jszip";

const projectRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(projectRoot, "dist");
const releaseRoot = resolve(projectRoot, "release");
const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")) as {
  version: string;
};
const outputPath = resolve(releaseRoot, `FloatRead-v${packageJson.version}.zip`);

async function addDirectory(zip: JSZip, directory: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await addDirectory(zip, path);
      continue;
    }
    const archivePath = relative(distRoot, path).replaceAll("\\", "/");
    zip.file(archivePath, await readFile(path), { date: new Date(0) });
  }
}

await mkdir(releaseRoot, { recursive: true });
await rm(outputPath, { force: true });
const zip = new JSZip();
await addDirectory(zip, distRoot);
const data = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
});
await writeFile(outputPath, data);
console.log(`${outputPath} (${(await stat(outputPath)).size} bytes)`);
