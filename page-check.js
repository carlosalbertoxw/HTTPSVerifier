import {
  collectInsecureUrls,
  countFindings,
  emptyFindings,
} from "./insecure-url.js";

// Runs inside every frame of the inspected page and returns the raw URLs,
// grouped by kind. Classification happens in the extension context (see
// insecure-url.js) so it can be unit tested. This function is serialized and
// injected, so it must be self-contained: no imports, no outer variables.
function collectFrameUrls() {
  const selectors = {
    resources: [
      [
        "img[src], script[src], iframe[src], frame[src], embed[src], " +
          "video[src], audio[src], source[src], track[src], " +
          "input[type='image' i][src]",
        "src",
      ],
      ["img[srcset], source[srcset]", "srcset"],
      ["video[poster]", "poster"],
      ["object[data]", "data"],
      [
        "link[href][rel~='stylesheet' i], link[href][rel~='icon' i], " +
          "link[href][rel~='preload' i], link[href][rel~='modulepreload' i], " +
          "link[href][rel~='manifest' i]",
        "href",
      ],
    ],
    forms: [
      ["form[action]", "action"],
      ["button[formaction], input[formaction]", "formaction"],
    ],
    links: [["a[href], area[href]", "href"]],
  };

  const entries = [];
  for (const [kind, groups] of Object.entries(selectors)) {
    for (const [selector, attribute] of groups) {
      document.querySelectorAll(selector).forEach((element) => {
        const value = element.getAttribute(attribute);
        if (value) {
          entries.push({ kind, value, srcset: attribute === "srcset" });
        }
      });
    }
  }

  // What the page actually requested: also covers CSS url(), fonts and
  // resources added by scripts after the markup was parsed. Chrome keeps only
  // the first 250 entries unless the page enlarges the buffer; the markup
  // selectors above still cover the rest. What a cross-origin stylesheet
  // loads (its @import and url()) is never reported here.
  for (const entry of performance.getEntriesByType("resource")) {
    entries.push({ kind: "resources", value: entry.name, srcset: false });
  }

  return { documentUrl: location.href, baseUri: document.baseURI, entries };
}

function injectCollector(tabId, allFrames) {
  return chrome.scripting.executeScript({
    target: { tabId, allFrames },
    func: collectFrameUrls,
  });
}

// Inspects a tab for HTTPS issues. Returns null when the tab cannot be
// checked at all (e.g. chrome:// pages). In the result, insecureCounts is
// null when the URLs were not checked (skipped or injection failed), and
// partial is true when some frames of the page could not be checked.
export async function inspectTab(tab, { includeUrls }) {
  if (!tab || !tab.url || !tab.url.startsWith("http")) {
    return null;
  }

  const inspection = {
    pageInsecure: !tab.url.startsWith("https://"),
    insecureCounts: null,
    partial: false,
  };

  if (!includeUrls) {
    return inspection;
  }

  let frames;
  try {
    frames = await injectCollector(tab.id, true);
  } catch (allFramesError) {
    // If one frame cannot be injected (e.g. a frame owned by another
    // extension) and Chrome rejects the whole call, still check the page
    // itself instead of reporting nothing.
    try {
      frames = await injectCollector(tab.id, false);
      inspection.partial = true;
    } catch (error) {
      // "Could not check" is not the same as "no issues": leave a trace. Only
      // the origin, as in the notifications: full URLs can carry secrets.
      console.debug(
        `HTTPS Verifier: could not inspect ${new URL(tab.url).origin}: ` +
          error.message
      );
      return inspection;
    }
  }

  const found = emptyFindings();
  let checkedFrames = 0;
  for (const frame of frames || []) {
    if (frame && frame.result) {
      collectInsecureUrls(frame.result, found);
      checkedFrames++;
    } else {
      inspection.partial = true;
    }
  }
  if (checkedFrames > 0) {
    inspection.insecureCounts = countFindings(found);
  }

  return inspection;
}
