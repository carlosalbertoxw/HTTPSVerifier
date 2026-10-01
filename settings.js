// Single source of truth for the extension settings, shared by the service
// worker and the popup. The storage keys keep their original names for
// backward compatibility with existing installs.
export const DEFAULT_SETTINGS = {
  enableNotificationsURL: true,
  enableNotificationsLINKS: true,
};

// Access to every site is optional (optional_host_permissions in the
// manifest): it is requested only when the user enables the automatic
// notifications. The on-demand check works without it, through activeTab.
export const HOST_PERMISSIONS = { origins: ["http://*/*", "https://*/*"] };

export function wantsAutomaticChecks(settings) {
  return Boolean(
    settings.enableNotificationsURL || settings.enableNotificationsLINKS
  );
}
