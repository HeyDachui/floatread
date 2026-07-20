import { providerProfileSchema, providerProfilesSchema } from "../providers/schemas";
import type { ProviderProfile } from "../providers/types";
import { getSettings, setActiveProviderId } from "./settings";
import { deleteProviderSecret } from "./secrets";

const PROFILES_KEY = "providerProfiles";

export async function listProviderProfiles(): Promise<ProviderProfile[]> {
  const stored = await chrome.storage.local.get(PROFILES_KEY);
  const parsed = providerProfilesSchema.safeParse(stored[PROFILES_KEY]);
  return parsed.success ? parsed.data : [];
}

export async function getProviderProfile(id: string): Promise<ProviderProfile | null> {
  return (await listProviderProfiles()).find((profile) => profile.id === id) ?? null;
}

export async function getActiveProviderProfile(): Promise<ProviderProfile | null> {
  const settings = await getSettings();
  return settings.activeProviderId ? getProviderProfile(settings.activeProviderId) : null;
}

export async function saveProviderProfile(profile: ProviderProfile): Promise<void> {
  const parsed = providerProfileSchema.parse(profile);
  const profiles = await listProviderProfiles();
  const index = profiles.findIndex((item) => item.id === parsed.id);
  const next =
    index >= 0
      ? profiles.map((item) => (item.id === parsed.id ? parsed : item))
      : [...profiles, parsed];
  await chrome.storage.local.set({ [PROFILES_KEY]: next });
}

export async function deleteProviderProfile(id: string): Promise<void> {
  const profiles = await listProviderProfiles();
  await chrome.storage.local.set({
    [PROFILES_KEY]: profiles.filter((profile) => profile.id !== id),
  });
  await deleteProviderSecret(id);
  const settings = await getSettings();
  if (settings.activeProviderId === id) await setActiveProviderId(null);
}

export async function activateProviderProfile(id: string): Promise<void> {
  if (!(await getProviderProfile(id))) throw new Error("Provider profile not found");
  await setActiveProviderId(id);
}
