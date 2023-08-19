document.addEventListener("DOMContentLoaded", () => {
  const toggleNotificationsURL = document.getElementById(
    "toggleNotificationsURL"
  );
  const toggleNotificationsLINKS = document.getElementById(
    "toggleNotificationsLINKS"
  );

  // Load the settings from local storage
  chrome.storage.local.get("enableNotificationsURL", (result) => {
    toggleNotificationsURL.checked = result.enableNotificationsURL !== false;
  });

  chrome.storage.local.get("enableNotificationsLINKS", (result) => {
    toggleNotificationsLINKS.checked =
      result.enableNotificationsLINKS !== false;
  });

  // Save the settings to local storage when the checkbox state changes
  toggleNotificationsURL.addEventListener("change", (event) => {
    chrome.storage.local.set({ enableNotificationsURL: event.target.checked });
  });
  toggleNotificationsLINKS.addEventListener("change", (event) => {
    chrome.storage.local.set({
      enableNotificationsLINKS: event.target.checked,
    });
  });
});
