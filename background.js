import { inspectTab } from "./page-check.js";
import { DEFAULT_SETTINGS } from "./settings.js";

const LAST_NOTIFIED_KEY = "lastNotifiedUrlByTab";

// Make the default settings explicit in storage on install/update.
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const missing = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (stored[key] === undefined) {
      missing[key] = value;
    }
  }
  if (Object.keys(missing).length > 0) {
    await chrome.storage.local.set(missing);
  }
});

function showNotification(title, message) {
  const notificationId = `issue-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "images/icon-48.png",
    title: title,
    message: message,
  });
}

// The last URL notified per tab lives in chrome.storage.session: it survives
// the MV3 service worker being suspended and is cleared when Chrome closes.
async function getLastNotifiedUrls() {
  const stored = await chrome.storage.session.get(LAST_NOTIFIED_KEY);
  return stored[LAST_NOTIFIED_KEY] || {};
}

async function setLastNotifiedUrl(tabId, url) {
  const lastNotified = await getLastNotifiedUrls();
  if (url === undefined) {
    delete lastNotified[tabId];
  } else {
    lastNotified[tabId] = url;
  }
  await chrome.storage.session.set({ [LAST_NOTIFIED_KEY]: lastNotified });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  setLastNotifiedUrl(tabId, undefined);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.status !== "complete" ||
    !tab.url ||
    !tab.url.startsWith("http")
  ) {
    return;
  }

  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const inspection = await inspectTab(tab, {
    includeResources: settings.enableNotificationsLINKS,
  });
  if (!inspection) {
    return;
  }

  const issues = [];
  if (settings.enableNotificationsURL && inspection.pageInsecure) {
    issues.push(chrome.i18n.getMessage("issuePageNotHttps"));
  }
  if (inspection.insecureCount > 0) {
    issues.push(
      chrome.i18n.getMessage("issueInsecureResources", [
        String(inspection.insecureCount),
      ])
    );
  }

  if (issues.length === 0) {
    return;
  }

  // A URL is notified at most once per tab while the user stays on it
  // (reloads included). Closing the tab, navigating to a different URL, or
  // closing the browser resets the deduplication.
  const lastNotified = await getLastNotifiedUrls();
  if (lastNotified[tabId] === tab.url) {
    return;
  }
  await setLastNotifiedUrl(tabId, tab.url);

  // Only the origin: full URLs can carry sensitive query strings and are
  // visible to anyone looking at the screen.
  showNotification(
    chrome.i18n.getMessage("notificationTitle", [new URL(tab.url).origin]),
    issues.join("\n")
  );
});
