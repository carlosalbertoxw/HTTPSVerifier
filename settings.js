// Single source of truth for the extension settings, shared by the service
// worker and the popup. The storage keys keep their original names for
// backward compatibility with existing installs.
export const DEFAULT_SETTINGS = {
  enableNotificationsURL: true,
  enableNotificationsLINKS: true,
};

export function wantsAutomaticChecks(settings) {
  return Boolean(
    settings.enableNotificationsURL || settings.enableNotificationsLINKS
  );
}
