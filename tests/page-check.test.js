import test from "node:test";
import assert from "node:assert/strict";
import { inspectTab } from "../page-check.js";

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
    await inspectTab({ id: 1, url: "chrome://settings" }, { includeUrls: true }),
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
  assert.deepEqual(inspection, { pageInsecure: true, insecureCounts: null });
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
  });
  assert.deepEqual(calls[0].target, { tabId: 7, allFrames: true });
  assert.equal(typeof calls[0].func, "function");
});

test("a failed injection reports the URLs as not checked", async (t) => {
  const debug = t.mock.method(console, "debug", () => {});
  fakeChrome(() => {
    throw new Error("Cannot access contents of the page");
  });

  const inspection = await inspectTab(
    { id: 2, url: "https://example.com/account?token=abc" },
    { includeUrls: true }
  );

  assert.deepEqual(inspection, { pageInsecure: false, insecureCounts: null });
  // Only the origin is logged, never the path or the query string.
  const [message] = debug.mock.calls[0].arguments;
  assert.match(message, /https:\/\/example\.com/);
  assert.doesNotMatch(message, /account|token/);
});
