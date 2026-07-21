import { z } from "zod";
import { translationLanguageSchema } from "../translation/languages";

const USAGE_SESSIONS_KEY = "translationUsageSessionsV1";
const MAX_SESSIONS = 100;

export const usageSessionSchema = z
  .object({
    id: z.string().uuid(),
    startedAt: z.number().int().nonnegative(),
    endedAt: z.number().int().nonnegative().nullable(),
    endReason: z.enum(["stopped", "cleared", "error", "page_closed"]).nullable(),
    provider: z.string().min(1).max(80),
    model: z.string().min(1).max(200),
    sourceLanguages: z.array(translationLanguageSchema).min(1).max(5),
    targetLanguage: translationLanguageSchema,
    requests: z.number().int().nonnegative(),
    cacheHits: z.number().int().nonnegative(),
    translatedSegments: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    usageAvailable: z.boolean(),
  })
  .strict();

export type UsageSession = z.infer<typeof usageSessionSchema>;

const usageSessionsSchema = z.array(usageSessionSchema).max(MAX_SESSIONS);
let mutationQueue: Promise<void> = Promise.resolve();

function mutateSessions(
  mutation: (sessions: UsageSession[]) => UsageSession[] | Promise<UsageSession[]>,
): Promise<void> {
  const operation = mutationQueue.then(async () => {
    const sessions = await readSessions();
    await writeSessions(await mutation(sessions));
  });
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

async function readSessions(): Promise<UsageSession[]> {
  const stored = await chrome.storage.local.get(USAGE_SESSIONS_KEY);
  const parsed = usageSessionsSchema.safeParse(stored[USAGE_SESSIONS_KEY]);
  if (parsed.success) return parsed.data;
  if (stored[USAGE_SESSIONS_KEY] !== undefined)
    await chrome.storage.local.remove(USAGE_SESSIONS_KEY);
  return [];
}

async function writeSessions(sessions: UsageSession[]): Promise<void> {
  await chrome.storage.local.set({
    [USAGE_SESSIONS_KEY]: sessions
      .sort((left, right) => right.startedAt - left.startedAt)
      .slice(0, MAX_SESSIONS),
  });
}

export async function startUsageSession(
  session: Pick<UsageSession, "id" | "provider" | "model" | "sourceLanguages" | "targetLanguage">,
): Promise<UsageSession> {
  const record = usageSessionSchema.parse({
    ...session,
    startedAt: Date.now(),
    endedAt: null,
    endReason: null,
    requests: 0,
    cacheHits: 0,
    translatedSegments: 0,
    inputTokens: 0,
    outputTokens: 0,
    usageAvailable: true,
  });
  await mutateSessions((sessions) => [record, ...sessions.filter((item) => item.id !== record.id)]);
  return record;
}

export async function addUsage(
  id: string,
  delta: Partial<
    Pick<
      UsageSession,
      "requests" | "cacheHits" | "translatedSegments" | "inputTokens" | "outputTokens"
    >
  > & {
    usageAvailable?: boolean;
  },
): Promise<void> {
  await mutateSessions((sessions) => {
    const current = sessions.find((item) => item.id === id);
    if (!current || current.endedAt !== null) return sessions;
    const next = usageSessionSchema.parse({
      ...current,
      requests: current.requests + (delta.requests ?? 0),
      cacheHits: current.cacheHits + (delta.cacheHits ?? 0),
      translatedSegments: current.translatedSegments + (delta.translatedSegments ?? 0),
      inputTokens: current.inputTokens + (delta.inputTokens ?? 0),
      outputTokens: current.outputTokens + (delta.outputTokens ?? 0),
      usageAvailable: current.usageAvailable && (delta.usageAvailable ?? true),
    });
    return sessions.map((item) => (item.id === id ? next : item));
  });
}

export async function endUsageSession(
  id: string,
  endReason: NonNullable<UsageSession["endReason"]>,
): Promise<void> {
  await mutateSessions((sessions) =>
    sessions.map((item) =>
      item.id === id && item.endedAt === null
        ? usageSessionSchema.parse({ ...item, endedAt: Date.now(), endReason })
        : item,
    ),
  );
}

export async function listUsageSessions(): Promise<UsageSession[]> {
  return readSessions();
}

export async function clearUsageSessions(): Promise<void> {
  const operation = mutationQueue.then(() => chrome.storage.local.remove(USAGE_SESSIONS_KEY));
  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  await operation;
}

export async function getLatestUsageSession(): Promise<UsageSession | null> {
  return (await readSessions())[0] ?? null;
}
