import type { SecretStorageMode } from "../providers/types";

const SECRET_KEY = "providerSecrets";
const memorySecrets = new Map<string, string>();

type SecretMap = Record<string, string>;

async function getMap(area: chrome.storage.StorageArea): Promise<SecretMap> {
  const result = await area.get(SECRET_KEY);
  const value = result[SECRET_KEY];
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

async function removeFromArea(area: chrome.storage.StorageArea, profileId: string): Promise<void> {
  const secrets = await getMap(area);
  if (!(profileId in secrets)) return;
  delete secrets[profileId];
  await area.set({ [SECRET_KEY]: secrets });
}

export async function deleteProviderSecret(profileId: string): Promise<void> {
  memorySecrets.delete(profileId);
  await Promise.all([
    removeFromArea(chrome.storage.local, profileId),
    removeFromArea(chrome.storage.session, profileId),
  ]);
}

export async function saveProviderSecret(
  profileId: string,
  mode: SecretStorageMode,
  secret: string,
): Promise<void> {
  await deleteProviderSecret(profileId);
  const value = secret.trim();
  if (!value) return;
  if (mode === "prompt_each_time") {
    memorySecrets.set(profileId, value);
    return;
  }
  const area = mode === "local" ? chrome.storage.local : chrome.storage.session;
  const secrets = await getMap(area);
  await area.set({ [SECRET_KEY]: { ...secrets, [profileId]: value } });
}

export async function getProviderSecret(
  profileId: string,
  mode: SecretStorageMode,
): Promise<string | undefined> {
  if (mode === "prompt_each_time") return memorySecrets.get(profileId);
  const area = mode === "local" ? chrome.storage.local : chrome.storage.session;
  return (await getMap(area))[profileId];
}
