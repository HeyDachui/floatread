let lastResult = "";

export function rememberLastResult(value: string): void {
  lastResult = value;
}

export function clearLastResult(): void {
  lastResult = "";
}

export async function copyLastResult(): Promise<boolean> {
  if (!lastResult) return false;
  try {
    await navigator.clipboard.writeText(lastResult);
    return true;
  } catch {
    return false;
  }
}
