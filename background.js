import { describeIssues } from "./issues.js";
import { inspectTab } from "./page-check.js";
import { DEFAULT_SETTINGS, wantsAutomaticChecks } from "./settings.js";

// One chrome.storage.session key per tab, so updates for different tabs never
// overwrite each other.
const LAST_NOTIFIED_PREFIX = "lastNotifiedUrl:";

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

// One notification per tab: a new one for the same tab replaces the previous
// one, and closing the tab removes it.
function notificationId(tabId) {
  return `issue-${tabId}`;
}

function showNotification(tabId, title, message) {
  chrome.notifications.create(notificationId(tabId), {
    type: "basic",
    iconUrl: "images/icon-48.png",
    title: title,
    message: message,
  });
}

// Storage work for the deduplication runs one task at a time. Otherwise the
// check-then-set below interleaves when a tab fires "complete" twice in a row
// and the same URL gets notified twice.
let storageQueue = Promise.resolve();
function enqueue(task) {
  storageQueue = storageQueue
    .then(task)
    .catch((error) => console.error("HTTPS Verifier:", error));
}

// The last URL notified per tab lives in chrome.storage.session: it survives
// the MV3 service worker being suspended and is cleared when Chrome closes.
// A URL is notified at most once per tab while the user stays on it (reloads
// included). Closing the tab, navigating to a different URL, or closing the
// browser resets the deduplication.
async function notifyOnce(tabId, url, issues) {
  const storageKey = LAST_NOTIFIED_PREFIX + tabId;
  const stored = await chrome.storage.session.get(storageKey);
  if (stored[storageKey] === url) {
    return;
  }
  await chrome.storage.session.set({ [storageKey]: url });

  // Only the origin: full URLs can carry sensitive query strings and are
  // visible to anyone looking at the screen.
  showNotification(
    tabId,
    chrome.i18n.getMessage("notificationTitle", [new URL(url).origin]),
    issues
      .map(([messageKey, substitutions]) =>
        chrome.i18n.getMessage(messageKey, substitutions)
      )
      .join("\n")
  );
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.notifications.clear(notificationId(tabId));
  enqueue(() => chrome.storage.session.remove(LAST_NOTIFIED_PREFIX + tabId));
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
  if (!wantsAutomaticChecks(settings)) {
    return;
  }

  const inspection = await inspectTab(tab, {
    includeUrls: settings.enableNotificationsLINKS,
  });
  if (!inspection) {
    return;
  }

  const issues = describeIssues(inspection, {
    includePage: settings.enableNotificationsURL,
  });
  if (issues.length === 0) {
    return;
  }

  enqueue(() => notifyOnce(tabId, tab.url, issues));
});
