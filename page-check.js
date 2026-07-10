import { isInsecureUrl } from "./insecure-url.js";

// Collects the candidate URLs from the page. Classification happens in the
// extension context (see insecure-url.js) so it can be unit tested.
function collectPageUrls(tab) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          const selector =
            "a[href], img[src], link[href][rel='stylesheet'], script[src]";
          const urls = [];
          document.querySelectorAll(selector).forEach((element) => {
            const attribute = element.hasAttribute("src") ? "src" : "href";
            const value = element.getAttribute(attribute);
            if (value) {
              urls.push(value);
            }
          });
          return { baseUri: document.baseURI, urls: urls };
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          // "Could not check" is not the same as "no issues": leave a trace.
          console.debug(
            `HTTPS Verifier: could not inspect ${tab.url}: ` +
              chrome.runtime.lastError.message
          );
          resolve(null);
          return;
        }
        resolve(results && results.length ? results[0].result : null);
      }
    );
  });
}

// Inspects a tab for HTTPS issues. Returns null when the tab cannot be
// checked at all (e.g. chrome:// pages). In the result, insecureCount is
// null when the resources were not checked (skipped or injection failed).
export async function inspectTab(tab, { includeResources }) {
  if (!tab || !tab.url || !tab.url.startsWith("http")) {
    return null;
  }

  const inspection = {
    pageInsecure: !tab.url.startsWith("https://"),
    insecureCount: null,
  };

  if (includeResources) {
    const page = await collectPageUrls(tab);
    if (page) {
      inspection.insecureCount = page.urls.filter((url) =>
        isInsecureUrl(url, page.baseUri)
      ).length;
    }
  }

  return inspection;
}
