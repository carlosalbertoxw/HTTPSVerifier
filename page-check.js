import {
  collectInsecureUrls,
  countFindings,
  emptyFindings,
  MAX_URLS_PER_KIND,
} from "./insecure-url.js";

// Runs inside every frame of the inspected page and returns the raw URLs,
// grouped by kind. Classification happens in the extension context (see
// insecure-url.js) so it can be unit tested. This function is serialized and
// injected, so it must be self-contained: no imports, no outer variables.
// Exported only for the unit tests.
export function collectFrameUrls(maxPerKind) {
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
  const collected = {};
  let truncated = false;
  function add(kind, value, srcset) {
    // A value that starts with a scheme other than http (https:, data:,
    // mailto:...) is parsed with that scheme, so it can never be insecure:
    // leave it out instead of sending it to the extension. The pattern only
    // matches what the URL parser reads as a scheme; anything else (relative
    // URLs, leading spaces) is kept and classified in the extension. A srcset
    // holds several URLs, so it is always kept.
    const scheme = srcset ? null : /^([a-z][a-z\d+.-]*):/i.exec(value);
    if (scheme && scheme[1].toLowerCase() !== "http") {
      return;
    }
    collected[kind] = (collected[kind] || 0) + 1;
    if (collected[kind] > maxPerKind) {
      truncated = true;
      return;
    }
    entries.push({ kind, value, srcset });
  }

  for (const [kind, groups] of Object.entries(selectors)) {
    for (const [selector, attribute] of groups) {
      document.querySelectorAll(selector).forEach((element) => {
        const value = element.getAttribute(attribute);
        if (value) {
          add(kind, value, attribute === "srcset");
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
    add("resources", entry.name, false);
  }

  return {
    documentUrl: location.href,
    baseUri: document.baseURI,
    entries,
    truncated,
  };
}

function injectCollector(tabId, allFrames) {
  return chrome.scripting.executeScript({
    target: { tabId, allFrames },
    func: collectFrameUrls,
    args: [MAX_URLS_PER_KIND],
  });
}

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch (error) {
    return null;
  }
}

// Inspects a tab for HTTPS issues. Returns null when the tab cannot be
// checked at all (e.g. chrome:// pages), or when it is no longer on the site
// of tab.url. In the result, insecureCounts is null when the URLs were not
// checked (skipped or injection failed), partial is true when some frames of
// the page could not be checked, and truncated is true when a frame had more
// URLs of one kind than MAX_URLS_PER_KIND.
export async function inspectTab(tab, { includeUrls }) {
  if (!tab || !tab.url || !tab.url.startsWith("http")) {
    return null;
  }

  const inspection = {
    pageInsecure: !tab.url.startsWith("https://"),
    insecureCounts: null,
    partial: false,
    truncated: false,
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
      // the origin, as in the notifications: full URLs can carry secrets, and
      // Chrome quotes the full URL in some messages ('Cannot access contents
      // of url "..."'), so quoted text is left out.
      console.debug(
        `HTTPS Verifier: could not inspect ${originOf(tab.url)}: ` +
          String(error.message).replace(/"[^"]*"/g, '"…"')
      );
      return inspection;
    }
  }

  // The tab may have navigated to another site while the check ran: then the
  // results are not about tab.url, and reporting them under its origin would
  // mix two pages. The next "complete" event checks the new page.
  const top = (frames || []).find((frame) => frame && frame.frameId === 0);
  if (
    top &&
    top.result &&
    originOf(top.result.documentUrl) !== originOf(tab.url)
  ) {
    return null;
  }

  const found = emptyFindings();
  let checkedFrames = 0;
  for (const frame of frames || []) {
    if (frame && frame.result) {
      collectInsecureUrls(frame.result, found);
      inspection.truncated ||= Boolean(frame.result.truncated);
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
