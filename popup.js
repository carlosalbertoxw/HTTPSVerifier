import { describeIssues } from "./issues.js";
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

function localize([messageKey, substitutions]) {
  return chrome.i18n.getMessage(messageKey, substitutions);
}

function renderResult(inspection) {
  let tone;
  let lines;

  if (!inspection) {
    tone = "muted";
    lines = [chrome.i18n.getMessage("checkNotPossible")];
  } else {
    const issues = describeIssues(inspection, { includePage: true });
    // "Could not check" is reported apart from the issues: it must never read
    // as "everything uses HTTPS".
    const notes = [];
    if (inspection.insecureCounts === null) {
      notes.push(["resourcesNotChecked", []]);
    } else if (inspection.partial) {
      notes.push([
        issues.length > 0 ? "framesNotChecked" : "checkResultPartial",
        [],
      ]);
    }

    if (issues.length > 0) {
      tone = "warn";
    } else if (notes.length > 0) {
      tone = "muted";
    } else {
      tone = "ok";
      issues.push(["checkResultOk", []]);
    }
    lines = [...issues, ...notes].map(localize);
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
