const initializeTrustedStorage = async (): Promise<void> => {
  await Promise.all([
    chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }),
    chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }),
  ]);
};

const initialization = initializeTrustedStorage();

chrome.runtime.onInstalled.addListener((details) => {
  void initialization.then(async () => {
    if (details.reason === "install") {
      await chrome.tabs.create({ url: chrome.runtime.getURL("src/options/onboarding/index.html") });
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  void initialization;
});
