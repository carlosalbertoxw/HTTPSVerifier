import { MAX_URLS_PER_KIND } from "./insecure-url.js";

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

// Result of the popup's manual check: a tone ("ok", "warn" or "muted") and
// the lines to show. "Could not check" is reported apart from the issues: it
// must never read as "everything uses HTTPS".
export function describeResult(inspection) {
  if (!inspection) {
    return { tone: "muted", lines: [["checkNotPossible", []]] };
  }

  const issues = describeIssues(inspection, { includePage: true });
  const notes = [];
  if (inspection.insecureCounts === null) {
    notes.push(["resourcesNotChecked", []]);
  } else if (inspection.partial) {
    notes.push([
      issues.length > 0 ? "framesNotChecked" : "checkResultPartial",
      [],
    ]);
  }
  if (inspection.truncated) {
    notes.push(["urlsTruncated", [String(MAX_URLS_PER_KIND)]]);
  }

  if (issues.length > 0) {
    return { tone: "warn", lines: [...issues, ...notes] };
  }
  if (notes.length > 0) {
    return { tone: "muted", lines: notes };
  }
  return { tone: "ok", lines: [["checkResultOk", []]] };
}

// On an HTTPS page Chrome blocks HTTP resources (mixed content) or upgrades
// them to HTTPS, so they are referenced over HTTP but not necessarily loaded
// over HTTP: say so instead of alarming the user.
function resourceMessage(kind, messageKey, inspection) {
  return kind === "resources" && !inspection.pageInsecure
    ? "issueMixedResources"
    : messageKey;
}
