import type { ReaderMode } from "../shared/types";

function resultFor(mode: ReaderMode, text: string): string {
  const fixedText = text === "We reset usage limits for affected Codex users.";
  if (mode === "natural_zh") {
    return fixedText ? "我们已重置受影响的 Codex 用户的使用限额。" : `Mock 自然中文：${text}`;
  }
  if (mode === "key_points") {
    return `【意思】\n${fixedText ? "受影响的 Codex 用户，其使用限额已经被重置。" : `这段文字在说明：${text}`}\n\n【重点】\n- 这是用户主动请求的本地 Mock 演示结果。\n\n【原文没有说明】\n原文没有说明受影响范围、重置原因或新的具体限额。`;
  }
  return `【通俗解释】\n${fixedText ? "平台重新设置了部分 Codex 用户可以使用服务的数量限制。" : `这段文字的意思是：${text}`}\n\n【术语】\n- usage limits：使用次数或用量方面的限制。\n- affected users：受到相关情况影响的用户。`;
}

export async function* streamMockResult(
  mode: ReaderMode,
  text: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const result = resultFor(mode, text);
  const chunks = result.match(/.{1,6}/gu) ?? [result];
  for (const chunk of chunks) {
    if (signal.aborted) throw new DOMException("The operation was aborted.", "AbortError");
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 18);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("The operation was aborted.", "AbortError"));
        },
        { once: true },
      );
    });
    yield chunk;
  }
}
