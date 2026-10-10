import { describeResult } from "./issues.js";
import { inspectTab } from "./page-check.js";
import { DEFAULT_SETTINGS } from "./settings.js";

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

const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);

for (const [checkboxId, settingKey] of Object.entries(checkboxes)) {
  const checkbox = document.getElementById(checkboxId);
  checkbox.checked = settings[settingKey];
  checkbox.addEventListener("change", (event) => {
    chrome.storage.local.set({ [settingKey]: event.target.checked });
  });
}

// Manual check of the active tab: always runs both checks, regardless of the
// notification toggles and of the notification deduplication.
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
  const { tone, lines } = describeResult(inspection);
  checkResult.className = tone;
  checkResult.textContent = "";
  for (const [messageKey, substitutions] of lines) {
    const div = document.createElement("div");
    div.textContent = chrome.i18n.getMessage(messageKey, substitutions);
    checkResult.appendChild(div);
  }
  checkResult.hidden = false;
}
