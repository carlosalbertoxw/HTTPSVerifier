document.addEventListener("DOMContentLoaded", () => {
  const toggleNotificationsURL = document.getElementById(
    "toggleNotificationsURL"
  );
  const toggleNotificationsLINKS = document.getElementById(
    "toggleNotificationsLINKS"
  );

  // Cargar la configuración del almacenamiento local
  chrome.storage.local.get("enableNotificationsURL", (result) => {
    toggleNotificationsURL.checked = result.enableNotificationsURL !== false;
  });

  chrome.storage.local.get("enableNotificationsLINKS", (result) => {
    toggleNotificationsLINKS.checked =
      result.enableNotificationsLINKS !== false;
  });

  // Guardar la configuración en el almacenamiento local cuando se cambie el estado del checkbox
  toggleNotificationsURL.addEventListener("change", (event) => {
    chrome.storage.local.set({ enableNotificationsURL: event.target.checked });
  });
  toggleNotificationsLINKS.addEventListener("change", (event) => {
    chrome.storage.local.set({
      enableNotificationsLINKS: event.target.checked,
    });
  });
});
