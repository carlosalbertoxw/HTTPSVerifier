import { describeIssues } from "./issues.js";
import { inspectTab } from "./page-check.js";
import {
  DEFAULT_SETTINGS,
  HOST_PERMISSIONS,
  wantsAutomaticChecks,
} from "./settings.js";

// Fill in the localized texts
document.documentElement.lang = chrome.i18n.getUILanguage();
document.title = chrome.i18n.getMessage("popupTitle");
document.querySelectorAll("[data-i18n]").forEach((element) => {
  element.textContent = chrome.i18n.getMessage(element.dataset.i18n);
});

const checkboxes = {
  toggleNotificationsURL: "enableNotificationsURL",
  toggleNotificationsLINKS: "enableNotificationsLINKS",
};

const permissionNotice = document.getElementById("permissionNotice");

// Shown when automatic notifications are enabled but the user has not
// granted (or has since revoked) access to the sites.
async function refreshPermissionNotice() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const granted = await chrome.permissions.contains(HOST_PERMISSIONS);
  permissionNotice.hidden = granted || !wantsAutomaticChecks(settings);
}

const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);

for (const [checkboxId, settingKey] of Object.entries(checkboxes)) {
  const checkbox = document.getElementById(checkboxId);
  checkbox.checked = settings[settingKey];
  checkbox.addEventListener("change", async (event) => {
    const enabled = event.target.checked;
    if (enabled) {
      // The request must start inside the click (Chrome only prompts on a
      // user gesture). The setting is saved before waiting for the answer
      // because the popup can close while the prompt is open.
      const request = chrome.permissions.request(HOST_PERMISSIONS);
      await chrome.storage.local.set({ [settingKey]: true });
      if (!(await request)) {
        event.target.checked = false;
        await chrome.storage.local.set({ [settingKey]: false });
      }
    } else {
      await chrome.storage.local.set({ [settingKey]: false });
      // Nothing automatic left to do: give the access back.
      const current = await chrome.storage.local.get(DEFAULT_SETTINGS);
      if (!wantsAutomaticChecks(current)) {
        await chrome.permissions.remove(HOST_PERMISSIONS);
      }
    }
    await refreshPermissionNotice();
  });
}

document
  .getElementById("grantPermission")
  .addEventListener("click", async () => {
    await chrome.permissions.request(HOST_PERMISSIONS);
    await refreshPermissionNotice();
  });

await refreshPermissionNotice();

// Manual check of the active tab: always runs both checks, regardless of the
// notification toggles and of the notification deduplication. Opening the
// popup grants activeTab, so it works without access to all sites (frames
// from other sites are then not inspected).
const checkButton = document.getElementById("checkNow");
const checkResult = document.getElementById("checkResult");

checkButton.addEventListener("click", async () => {
  checkButton.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const inspection = tab
      ? await inspectTab(tab, { includeUrls: true })
      : null;
    renderResult(inspection);
  } finally {
    checkButton.disabled = false;
  }
});

function renderResult(inspection) {
  let lines = [];
  let tone = "warn";

  if (!inspection) {
    tone = "muted";
    lines.push(chrome.i18n.getMessage("checkNotPossible"));
  } else {
    lines = describeIssues(inspection, { includePage: true }).map(
      ([messageKey, substitutions]) =>
        chrome.i18n.getMessage(messageKey, substitutions)
    );
    if (inspection.insecureCounts === null) {
      lines.push(chrome.i18n.getMessage("resourcesNotChecked"));
    }
    if (lines.length === 0) {
      tone = "ok";
      lines.push(chrome.i18n.getMessage("checkResultOk"));
    }
  }

  checkResult.className = tone;
  checkResult.textContent = "";
  for (const line of lines) {
    const div = document.createElement("div");
    div.textContent = line;
    checkResult.appendChild(div);
  }
  checkResult.hidden = false;
}
