import { access, readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(projectRoot, "dist");

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

const requiredFiles = [
  "manifest.json",
  "background/service-worker.js",
  "content/content-script.js",
  "src/popup/index.html",
  "src/options/index.html",
  "src/options/onboarding/index.html",
];

for (const file of requiredFiles) {
  await access(resolve(distRoot, file));
}

const manifest = JSON.parse(await readFile(resolve(distRoot, "manifest.json"), "utf8")) as {
  manifest_version: number;
  permissions: string[];
  optional_host_permissions: string[];
};

if (manifest.manifest_version !== 3) {
  throw new Error("dist manifest is not Manifest V3");
}
if (manifest.optional_host_permissions.includes("<all_urls>")) {
  throw new Error("dist manifest contains a forbidden <all_urls> permission");
}
for (const forbidden of ["tabs", "history", "cookies", "webRequest", "unlimitedStorage"]) {
  if (manifest.permissions.includes(forbidden)) {
    throw new Error(`dist manifest contains forbidden permission: ${forbidden}`);
  }
}

const files = await listFiles(distRoot);
for (const file of files) {
  const relativePath = relative(distRoot, file).replaceAll("\\", "/");
  if (
    relativePath.includes(".env") ||
    relativePath.includes(".secrets") ||
    relativePath.includes("node_modules") ||
    relativePath.endsWith(".map") ||
    relativePath.includes("/tests/")
  ) {
    throw new Error(`forbidden release file: ${relativePath}`);
  }
  const size = (await stat(file)).size;
  if (size === 0) {
    throw new Error(`empty release file: ${relativePath}`);
  }
}

const contentBundle = await readFile(resolve(distRoot, "content/content-script.js"), "utf8");
if (!contentBundle.includes('mode:"closed"') && !contentBundle.includes('mode: "closed"')) {
  throw new Error("production content bundle does not prove a closed Shadow DOM");
}
if (contentBundle.includes('mode:"open"') || contentBundle.includes('mode: "open"')) {
  throw new Error("production content bundle contains an open Shadow DOM");
}

const executableFiles = files.filter((file) => /\.(?:js|html)$/u.test(file));
for (const file of executableFiles) {
  const source = await readFile(file, "utf8");
  if (/\beval\s*\(|\bnew\s+Function\s*\(/u.test(source)) {
    throw new Error(`dynamic code execution found in ${relative(distRoot, file)}`);
  }
  if (/<script[^>]+src=["']https?:/iu.test(source)) {
    throw new Error(`remote script found in ${relative(distRoot, file)}`);
  }
  if (
    source.includes("Mock Provider") ||
    source.includes("Mock 自然中文") ||
    source.includes("本地 Mock 演示结果")
  ) {
    throw new Error(`development Mock code found in ${relative(distRoot, file)}`);
  }
}

console.log(`Verified ${files.length} dist files.`);
