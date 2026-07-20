import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createManifest } from "../src/manifest";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

export async function buildManifest(outDir = "dist", isE2E = false): Promise<void> {
  const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")) as {
    version: string;
  };
  const manifest = createManifest(packageJson.version, isE2E);
  await writeFile(
    resolve(projectRoot, outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildManifest();
}
