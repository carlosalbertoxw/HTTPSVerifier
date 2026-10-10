import test from "node:test";
import assert from "node:assert/strict";
import { MAX_URLS_PER_KIND } from "../insecure-url.js";
import { collectFrameUrls, inspectTab } from "../page-check.js";

// Minimal stand-in for the chrome.scripting API used by inspectTab. Returns
// the options of every executeScript call.
function fakeChrome(executeScript) {
  const calls = [];
  globalThis.chrome = {
    scripting: {
      executeScript: async (options) => {
        calls.push(options);
        return executeScript(options);
      },
    },
  };
  return calls;
}

const HTTPS_TAB = { id: 7, url: "https://example.com/page" };

test("non-web tabs cannot be checked", async () => {
  fakeChrome(() => assert.fail("must not inject"));
  assert.equal(
    await inspectTab(
      { id: 1, url: "chrome://settings" },
      { includeUrls: true }
    ),
    null
  );
  assert.equal(await inspectTab(undefined, { includeUrls: true }), null);
});

test("without includeUrls nothing is injected", async () => {
  const calls = fakeChrome(() => []);
  const inspection = await inspectTab(
    { id: 1, url: "http://example.com/" },
    { includeUrls: false }
  );
  assert.deepEqual(inspection, {
    pageInsecure: true,
    insecureCounts: null,
    partial: false,
    truncated: false,
  });
  assert.equal(calls.length, 0);
});

test("the results of every frame are merged", async () => {
  const calls = fakeChrome(() => [
    {
      frameId: 0,
      result: {
        documentUrl: HTTPS_TAB.url,
        baseUri: HTTPS_TAB.url,
        entries: [
          { kind: "resources", value: "http://cdn.example.net/a.js" },
          { kind: "links", value: "http://other.example/" },
        ],
      },
    },
    {
      frameId: 3,
      result: {
        documentUrl: "https://frame.example/",
        baseUri: "https://frame.example/",
        entries: [{ kind: "forms", value: "http://frame.example/send" }],
      },
    },
    { frameId: 4, result: null },
  ]);

  const inspection = await inspectTab(HTTPS_TAB, { includeUrls: true });

  assert.deepEqual(inspection, {
    pageInsecure: false,
    insecureCounts: { resources: 1, forms: 1, links: 1 },
    // Frame 4 returned no result.
    partial: true,
    truncated: false,
  });
  assert.deepEqual(calls[0].target, { tabId: 7, allFrames: true });
  assert.equal(typeof calls[0].func, "function");
  assert.deepEqual(calls[0].args, [MAX_URLS_PER_KIND]);
});

test("a failed injection reports the URLs as not checked", async (t) => {
  const debug = t.mock.method(console, "debug", () => {});
  // The message Chrome gives when the extension has no access to the site
  // (e.g. restricted from the site access menu) quotes the full URL.
  fakeChrome(() => {
    throw new Error(
      'Cannot access contents of url "https://example.com/account?token=abc". ' +
        "Extension manifest must request permission to access this host."
    );
  });

  const inspection = await inspectTab(
    { id: 2, url: "https://example.com/account?token=abc" },
    { includeUrls: true }
  );

  assert.deepEqual(inspection, {
    pageInsecure: false,
    insecureCounts: null,
    partial: false,
    truncated: false,
  });
  // Only the origin is logged, never the path or the query string.
  const [message] = debug.mock.calls[0].arguments;
  assert.match(message, /https:\/\/example\.com/);
  assert.doesNotMatch(message, /account|token/);
  assert.match(message, /Cannot access contents of url "…"/);
});

test("if injecting into every frame fails, the top frame is still checked", async () => {
  const calls = fakeChrome(({ target }) => {
    if (target.allFrames) {
      throw new Error(
        "Cannot access a chrome-extension:// URL of different extension"
      );
    }
    return [
      {
        frameId: 0,
        result: {
          documentUrl: HTTPS_TAB.url,
          baseUri: HTTPS_TAB.url,
          entries: [
            { kind: "resources", value: "http://cdn.example.net/a.js" },
          ],
        },
      },
    ];
  });

  const inspection = await inspectTab(HTTPS_TAB, { includeUrls: true });

  assert.deepEqual(inspection, {
    pageInsecure: false,
    insecureCounts: { resources: 1, forms: 0, links: 0 },
    partial: true,
    truncated: false,
  });
  assert.deepEqual(
    calls.map(({ target }) => target.allFrames),
    [true, false]
  );
});

test("results from a page on another site are discarded", async () => {
  // The tab navigated to another site while the check ran.
  fakeChrome(() => [
    {
      frameId: 0,
      result: {
        documentUrl: "https://other.example/",
        baseUri: "https://other.example/",
        entries: [{ kind: "links", value: "http://insecure.example/" }],
      },
    },
  ]);
  assert.equal(await inspectTab(HTTPS_TAB, { includeUrls: true }), null);
});

test("another page of the same site is still reported", async () => {
  // E.g. a single-page app that changes its path right after loading.
  fakeChrome(() => [
    {
      frameId: 0,
      result: {
        documentUrl: "https://example.com/home",
        baseUri: "https://example.com/home",
        entries: [{ kind: "links", value: "http://insecure.example/" }],
      },
    },
  ]);
  const inspection = await inspectTab(HTTPS_TAB, { includeUrls: true });
  assert.deepEqual(inspection.insecureCounts, {
    resources: 0,
    forms: 0,
    links: 1,
  });
});

test("a frame that reached the limit marks the inspection as truncated", async () => {
  fakeChrome(() => [
    {
      frameId: 0,
      result: {
        documentUrl: HTTPS_TAB.url,
        baseUri: HTTPS_TAB.url,
        entries: [],
      },
    },
    {
      frameId: 2,
      result: {
        documentUrl: "https://frame.example/",
        baseUri: "https://frame.example/",
        entries: [{ kind: "links", value: "http://insecure.example/" }],
        truncated: true,
      },
    },
  ]);
  const inspection = await inspectTab(HTTPS_TAB, { includeUrls: true });
  assert.equal(inspection.truncated, true);
  assert.equal(inspection.partial, false);
});

// Runs collectFrameUrls against a minimal stand-in for a document: each
// element matches a selector that contains "tag[attribute]".
function collectFrom(elements, { resources = [], maxPerKind = 100 } = {}) {
  const globals = {
    document: {
      baseURI: "https://example.com/",
      querySelectorAll: (selector) =>
        elements.filter(({ tag, attributes }) =>
          Object.keys(attributes).some((name) =>
            selector.includes(`${tag}[${name}]`)
          )
        ),
    },
    location: { href: "https://example.com/" },
    performance: {
      getEntriesByType: () => resources.map((name) => ({ name })),
    },
  };
  const saved = {};
  for (const [name, value] of Object.entries(globals)) {
    saved[name] = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true });
  }
  try {
    return collectFrameUrls(maxPerKind);
  } finally {
    for (const [name, descriptor] of Object.entries(saved)) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    }
  }
}

const element = (tag, attributes) => ({
  tag,
  attributes,
  getAttribute: (name) => attributes[name] ?? null,
});

test("URLs that can never be insecure are left out in the page", () => {
  const result = collectFrom(
    [
      "https://secure.example/",
      "HTTP://insecure.example/",
      "relative/page",
      "//protocol-relative.example/",
      " https://leading-space.example/",
      "mailto:someone@example.com",
      "data:text/plain,hi",
      "javascript:void(0)",
    ].map((href) => element("a", { href })),
    {
      resources: ["https://cdn.example/a.js", "http://cdn.example/b.js"],
    }
  );
  assert.deepEqual(
    result.entries.map(({ kind, value }) => [kind, value]),
    [
      ["links", "HTTP://insecure.example/"],
      ["links", "relative/page"],
      ["links", "//protocol-relative.example/"],
      // Kept: the URL parser ignores the space, the pattern does not.
      ["links", " https://leading-space.example/"],
      ["resources", "http://cdn.example/b.js"],
    ]
  );
  assert.equal(result.truncated, false);
  assert.equal(result.documentUrl, "https://example.com/");
});

test("a srcset is always sent, since it holds several URLs", () => {
  const srcset = "https://a.example/1.png 1x, http://b.example/2.png 2x";
  const result = collectFrom([element("img", { srcset })]);
  assert.deepEqual(result.entries, [
    { kind: "resources", value: srcset, srcset: true },
  ]);
});

test("each kind stops at the limit and the result says so", () => {
  const result = collectFrom(
    [
      ...[1, 2, 3].map((n) => element("a", { href: `http://x.example/${n}` })),
      element("form", { action: "http://x.example/send" }),
    ],
    { maxPerKind: 2 }
  );
  assert.deepEqual(
    result.entries.map(({ kind, value }) => [kind, value]),
    [
      ["forms", "http://x.example/send"],
      ["links", "http://x.example/1"],
      ["links", "http://x.example/2"],
    ]
  );
  assert.equal(result.truncated, true);
});
