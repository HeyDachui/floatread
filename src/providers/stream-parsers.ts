import { ProviderFailure } from "./types";
import { publicError } from "../shared/errors";

export async function* streamUtf8Lines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        yield buffer.slice(0, newline).replace(/\r$/u, "");
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    if (buffer.length > 0) yield buffer.replace(/\r$/u, "");
  } finally {
    reader.releaseLock();
  }
}

export async function* parseSseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  let dataLines: string[] = [];
  for await (const line of streamUtf8Lines(body)) {
    if (line.length === 0) {
      if (dataLines.length > 0) yield dataLines.join("\n");
      dataLines = [];
      continue;
    }
    if (line.startsWith(":")) continue;
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length > 0) yield dataLines.join("\n");
}

export function parseJsonRecord(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new ProviderFailure(publicError("INVALID_RESPONSE", "Provider 返回了无法解析的数据。"));
  }
}

export function nestedString(value: unknown, path: Array<string | number>): string | undefined {
  let current = value;
  for (const part of path) {
    if (typeof part === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[part];
    } else {
      if (typeof current !== "object" || current === null || Array.isArray(current))
        return undefined;
      current = (current as Record<string, unknown>)[part];
    }
  }
  return typeof current === "string" ? current : undefined;
}
