// Pure classification logic, shared by the service worker and the unit tests.
export function isInsecureUrl(value, baseUri) {
  if (!value) {
    return false;
  }

  try {
    // Resolving against the page base also catches protocol-relative URLs
    // ("//example.com/...") that would load over HTTP on an HTTP page.
    return new URL(value, baseUri).protocol === "http:";
  } catch (error) {
    // Not a resolvable URL.
    return false;
  }
}
