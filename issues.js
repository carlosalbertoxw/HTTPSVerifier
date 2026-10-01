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
        issues.push([messageKey, [String(count)]]);
      }
    }
  }
  return issues;
}
