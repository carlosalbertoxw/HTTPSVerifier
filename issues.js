// Turns an inspection into the lines to show, as [messageKey, substitutions]
// pairs for chrome.i18n.getMessage, so the notification and the popup word
// the issues the same way. Pure, so it can be unit tested.
const COUNT_MESSAGES = [
  ["resources", "issueInsecureResources"],
  ["forms", "issueInsecureForms"],
  ["links", "issueInsecureLinks"],
];

export function describeIssues(inspection, { includePage }) {
  const issues = [];
  if (includePage && inspection.pageInsecure) {
    issues.push(["issuePageNotHttps", []]);
  }
  if (inspection.insecureCounts) {
    for (const [kind, messageKey] of COUNT_MESSAGES) {
      const count = inspection.insecureCounts[kind];
      if (count > 0) {
        issues.push([
          resourceMessage(kind, messageKey, inspection),
          [String(count)],
        ]);
      }
    }
  }
  return issues;
}

// On an HTTPS page Chrome blocks HTTP resources (mixed content) or upgrades
// them to HTTPS, so they are referenced over HTTP but not necessarily loaded
// over HTTP: say so instead of alarming the user.
function resourceMessage(kind, messageKey, inspection) {
  return kind === "resources" && !inspection.pageInsecure
    ? "issueMixedResources"
    : messageKey;
}
