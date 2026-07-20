import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { unzipSync } from "fflate";

const projectRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(projectRoot, "dist");
const releaseRoot = resolve(projectRoot, "release");
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

const patterns = [
  { name: "private key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu },
  { name: "OpenAI-style key", expression: /\bsk-(?!example|not-a-real)[A-Za-z0-9_-]{20,}\b/gu },
  { name: "Anthropic key", expression: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/gu },
  { name: "Google API key", expression: /\bAIza[0-9A-Za-z_-]{30,}\b/gu },
  { name: "GitHub token", expression: /\bgh[opsu]_[A-Za-z0-9]{30,}\b/gu },
  { name: "AWS access key", expression: /\bAKIA[0-9A-Z]{16}\b/gu },
  {
    name: "assigned FloatRead test secret",
    expression:
      /FLOATREAD_TEST_(?:OPENAI|DEEPSEEK|ANTHROPIC|GEMINI|OPENAI_COMPATIBLE)_KEY\s*=\s*["']?(?!sk-example-not-a-real-key)[^\s"']{12,}/gu,
  },
  {
    name: "hard-coded bearer token",
    expression: /Authorization["']?\s*[:=]\s*["']Bearer\s+(?!<|\$\{|example)[A-Za-z0-9._-]{20,}/giu,
  },
] as const;

async function listFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? listFiles(path) : [path];
      }),
    );
    return files.flat();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function scanText(label: string, source: string): string[] {
  const findings: string[] = [];
  for (const pattern of patterns) {
    pattern.expression.lastIndex = 0;
    const matches = [...source.matchAll(pattern.expression)];
    const realMatches = matches.filter((match) => {
      const normalized = match[0].toLowerCase();
      return !normalized.includes("example") && !normalized.includes("not-real");
    });
    if (realMatches.length > 0) {
      findings.push(`${label}: ${pattern.name}`);
    }
  }
  return findings;
}

function trackedFiles(): string[] {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  return output.split("\0").filter(Boolean);
}

const findings: string[] = [];
let scanned = 0;

for (const tracked of trackedFiles()) {
  if (!textExtensions.has(extname(tracked).toLowerCase())) continue;
  const source = await readFile(resolve(projectRoot, tracked), "utf8");
  findings.push(...scanText(`tracked:${tracked.replaceAll("\\", "/")}`, source));
  scanned += 1;
}

for (const path of await listFiles(distRoot)) {
  if (!textExtensions.has(extname(path).toLowerCase())) continue;
  const source = await readFile(path, "utf8");
  findings.push(...scanText(`dist:${relative(distRoot, path).replaceAll("\\", "/")}`, source));
  scanned += 1;
}

for (const path of await listFiles(releaseRoot)) {
  if (extname(path).toLowerCase() !== ".zip") continue;
  const entries = unzipSync(await readFile(path));
  for (const [name, data] of Object.entries(entries)) {
    if (!textExtensions.has(extname(name).toLowerCase())) continue;
    findings.push(...scanText(`release:${name}`, new TextDecoder().decode(data)));
    scanned += 1;
  }
}

if (findings.length > 0) {
  throw new Error(`Secret scan failed:\n${findings.join("\n")}`);
}

console.log(`Secret scan passed across ${scanned} tracked/build/archive text files.`);
