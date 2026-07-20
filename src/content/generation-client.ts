import {
  GENERATION_PORT_NAME,
  generationPortOutgoingSchema,
  type GenerationPortOutgoing,
} from "../shared/messages";
import type { ReaderMode } from "../shared/types";

export interface GenerationClient {
  start(requestId: string, text: string, mode: ReaderMode): void;
  cancel(requestId: string): void;
  dispose(): void;
}

export function createGenerationClient(
  onEvent: (event: GenerationPortOutgoing) => void,
): GenerationClient {
  const port = chrome.runtime.connect({ name: GENERATION_PORT_NAME });
  port.onMessage.addListener((message: unknown) => {
    const parsed = generationPortOutgoingSchema.safeParse(message);
    if (parsed.success) onEvent(parsed.data);
  });

  return {
    start: (requestId, text, mode) => {
      port.postMessage({ type: "GENERATE_START", requestId, text, mode });
    },
    cancel: (requestId) => {
      port.postMessage({ type: "GENERATE_CANCEL", requestId });
    },
    dispose: () => port.disconnect(),
  };
}
