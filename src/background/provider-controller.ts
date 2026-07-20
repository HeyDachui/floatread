import { clearAllCaches, getCacheStats } from "../cache/service";
import { validateProviderUrl } from "../providers/config";
import { getProviderAdapter } from "../providers/router";
import type { ProviderProfile } from "../providers/types";
import type { BackgroundResponse, TrustedToBackgroundMessage } from "../shared/messages";
import { deleteInstalledSkin, getRuntimeSkin, listRuntimeSkins } from "../skins/storage";
import {
  activateProviderProfile,
  deleteProviderProfile,
  getProviderProfile,
  listProviderProfiles,
  saveProviderProfile,
} from "../storage/providers";
import { deleteProviderSecret, getProviderSecret, saveProviderSecret } from "../storage/secrets";
import {
  getSettings,
  restoreDefaultSettings,
  setActiveSkinId,
  updateAppearance,
  updateCachePolicy,
} from "../storage/settings";

async function refreshCompanions(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(
    tabs.flatMap((tab) =>
      typeof tab.id === "number"
        ? [chrome.tabs.sendMessage(tab.id, { type: "REFRESH_COMPANION" })]
        : [],
    ),
  );
}

async function hasHostPermission(profile: ProviderProfile): Promise<boolean> {
  const result = validateProviderUrl(profile);
  if (!result.valid) return false;
  return chrome.permissions.contains({ origins: [result.permission] });
}

async function saveProfile(profile: ProviderProfile, secret?: string): Promise<void> {
  const previous = await getProviderProfile(profile.id);
  const previousSecret = previous
    ? await getProviderSecret(previous.id, previous.secretStorageMode)
    : undefined;
  await saveProviderProfile(profile);
  if (secret !== undefined || previous?.secretStorageMode !== profile.secretStorageMode) {
    await saveProviderSecret(
      profile.id,
      profile.secretStorageMode,
      secret?.trim() || previousSecret || "",
    );
  }
}

export async function routeTrustedProviderMessage(
  message: TrustedToBackgroundMessage,
): Promise<BackgroundResponse> {
  switch (message.type) {
    case "LIST_PROVIDER_PROFILES":
      return { ok: true, data: await listProviderProfiles() };
    case "SAVE_PROVIDER_PROFILE":
      await saveProfile(message.profile, message.secret);
      return { ok: true };
    case "DELETE_PROVIDER_PROFILE":
      await deleteProviderProfile(message.profileId);
      return { ok: true };
    case "ACTIVATE_PROVIDER_PROFILE":
      await activateProviderProfile(message.profileId);
      return { ok: true };
    case "CLEAR_PROVIDER_SECRET":
      await deleteProviderSecret(message.profileId);
      return { ok: true };
    case "TEST_PROVIDER_CONNECTION": {
      const profile = await getProviderProfile(message.profileId);
      if (!profile) {
        return {
          ok: false,
          error: { code: "INVALID_MESSAGE", message: "Provider profile not found." },
        };
      }
      if (!(await hasHostPermission(profile))) {
        return {
          ok: true,
          data: {
            ok: false,
            providerLabel: profile.displayName,
            totalMs: 0,
            error: {
              code: "HOST_PERMISSION_DENIED",
              message: "尚未授权访问此 Provider 域名。",
              retryable: false,
            },
          },
        };
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), profile.timeoutMs);
      try {
        return {
          ok: true,
          data: await getProviderAdapter(profile.kind).testConnection(
            profile,
            await getProviderSecret(profile.id, profile.secretStorageMode),
            controller.signal,
          ),
        };
      } finally {
        clearTimeout(timer);
      }
    }
    case "GET_CACHE_STATUS": {
      const settings = await getSettings();
      return { ok: true, data: { policy: settings.cache, stats: await getCacheStats() } };
    }
    case "UPDATE_CACHE_POLICY":
      await updateCachePolicy(message.cache);
      return { ok: true };
    case "CLEAR_RESULT_CACHE":
      await clearAllCaches();
      return { ok: true };
    case "RESTORE_DEFAULT_SETTINGS":
      await restoreDefaultSettings();
      await refreshCompanions();
      return { ok: true };
    case "LIST_RUNTIME_SKINS":
      return { ok: true, data: await listRuntimeSkins() };
    case "UPDATE_APPEARANCE":
      await updateAppearance(message.appearance);
      await refreshCompanions();
      return { ok: true };
    case "ACTIVATE_SKIN": {
      const skin = await getRuntimeSkin(message.skinId);
      if (skin.id !== message.skinId) {
        return {
          ok: false,
          error: { code: "INVALID_MESSAGE", message: "Skin not found." },
        };
      }
      await setActiveSkinId(message.skinId);
      await refreshCompanions();
      return { ok: true };
    }
    case "DELETE_INSTALLED_SKIN": {
      const settings = await getSettings();
      if (settings.activeSkinId === message.skinId) await setActiveSkinId("native");
      await deleteInstalledSkin(message.skinId);
      await refreshCompanions();
      return { ok: true };
    }
  }
}
