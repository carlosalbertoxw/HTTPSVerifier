// Pure classification logic, shared by the service worker, the popup and the
// unit tests.

// Kinds of URL collected from a page, in the order they are reported.
export const URL_KINDS = ["resources", "forms", "links"];

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

// Extracts the URLs of a srcset attribute ("small.png 1x, large.png 2x").
// A URL runs until whitespace, so commas inside it (data: URLs) are kept.
export function parseSrcset(value) {
  const urls = [];
  if (!value) {
    return urls;
  }

  let i = 0;
  while (i < value.length) {
    while (i < value.length && /[\s,]/.test(value[i])) {
      i++;
    }
    const start = i;
    while (i < value.length && !/\s/.test(value[i])) {
      i++;
    }
    let url = value.slice(start, i);
    if (url.endsWith(",")) {
      // Candidate without descriptors: the comma closes it.
      url = url.replace(/,+$/, "");
    } else {
      // Skip the descriptors ("2x", "480w") up to the next candidate.
      while (i < value.length && value[i] !== ",") {
        i++;
      }
    }
    if (url) {
      urls.push(url);
    }
  }
  return urls;
}

export function emptyFindings() {
  return Object.fromEntries(URL_KINDS.map((kind) => [kind, new Set()]));
}

// Adds the distinct insecure URLs of one document (the page or one of its
// frames) to `found`. On an HTTP document, URLs of its own origin are skipped:
// the "page does not use HTTPS" warning already covers them, and counting
// every internal link would only add noise.
export function collectInsecureUrls(
  { documentUrl, baseUri, entries },
  found = emptyFindings()
) {
  let documentOrigin = null;
  let documentInsecure = false;
  try {
    const url = new URL(documentUrl);
    documentOrigin = url.origin;
    documentInsecure = url.protocol === "http:";
  } catch (error) {
    // about:blank, about:srcdoc...: compare against nothing.
  }

  for (const { kind, value, srcset } of entries) {
    if (!found[kind]) {
      continue;
    }
    for (const candidate of srcset ? parseSrcset(value) : [value]) {
      if (!isInsecureUrl(candidate, baseUri)) {
        continue;
      }
      const url = new URL(candidate, baseUri);
      if (documentInsecure && url.origin === documentOrigin) {
        continue;
      }
      // "page#a" and "page#b" are the same insecure request.
      url.hash = "";
      found[kind].add(url.href);
    }
  }
  return found;
}

export function countFindings(found) {
  return Object.fromEntries(URL_KINDS.map((kind) => [kind, found[kind].size]));
}
