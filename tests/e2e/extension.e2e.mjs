// End-to-end test: loads the packaged files of the extension into Chrome for
// Testing (Puppeteer) and checks it against the manual test page, whose
// expected result lives in tests/manual/server.mjs.
//
// Usage: npm run test:e2e. Not part of npm test: it needs the browser that
// Puppeteer downloads and takes several seconds.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { listFiles, PACKAGE_ENTRIES } from "../../scripts/build.mjs";
import { EXPECTED, PAGE, startServers } from "../manual/server.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

let extensionDir;
let stopServers;
let browser;
let worker;
let extensionId;

before(async () => {
  // Exactly the files that go into the store ZIP, so a module missing from
  // PACKAGE_ENTRIES fails here too.
  extensionDir = mkdtempSync(path.join(os.tmpdir(), "https-verifier-e2e-"));
  for (const file of PACKAGE_ENTRIES.flatMap(listFiles)) {
    cpSync(path.join(ROOT, file), path.join(extensionDir, file));
  }

  stopServers = await startServers();
  browser = await puppeteer.launch({
    enableExtensions: [extensionDir],
    args: [
      "--lang=en-US",
      // Ubuntu 23.10+ (GitHub runners) blocks the user namespaces Chrome's
      // sandbox needs. Only our local test page is loaded, so CI goes without.
      ...(process.env.CI ? ["--no-sandbox"] : []),
    ],
  });

  const target = await browser.waitForTarget(
    (candidate) =>
      candidate.type() === "service_worker" &&
      candidate.url().endsWith("/background.js")
  );
  extensionId = new URL(target.url()).host;
  worker = await target.worker();

  // Records what the service worker shows, and still shows it.
  await worker.evaluate(() => {
    globalThis.shownNotifications = [];
    const create = chrome.notifications.create.bind(chrome.notifications);
    chrome.notifications.create = (id, options) => {
      globalThis.shownNotifications.push({ id, ...options });
      return create(id, options);
    };
  });
});

after(async () => {
  await browser?.close();
  await stopServers?.();
  if (extensionDir) {
    rmSync(extensionDir, { recursive: true, force: true });
  }
});

const shown = () => worker.evaluate(() => globalThis.shownNotifications);

// Polls until `check` returns a truthy value or the time runs out.
async function waitFor(check, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await check();
    if (value || Date.now() > deadline) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

test("loading the test page notifies the expected issues once", async () => {
  const page = await browser.newPage();
  await page.goto(`${PAGE}/`, { waitUntil: "load" });

  const notifications = await waitFor(async () => {
    const list = await shown();
    return list.length > 0 && list;
  });
  assert.ok(notifications, "no notification was shown");
  assert.equal(notifications.length, 1);
  const [notification] = notifications;
  assert.match(notification.id, /^issue-\d+$/);
  assert.equal(notification.title, "HTTPS issues on http://localhost:8080");
  assert.deepEqual(notification.message.split("\n"), EXPECTED);

  // A reload of the same URL must not notify again...
  await page.reload({ waitUntil: "load" });
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  assert.equal((await shown()).length, 1);

  // ...but another URL in the same tab must, replacing the notification.
  await page.goto(`${PAGE}/?again`, { waitUntil: "load" });
  const again = await waitFor(async () => {
    const list = await shown();
    return list.length > 1 && list;
  });
  assert.ok(again, "navigating to another URL did not notify");
  assert.equal(again[1].id, notification.id);

  await page.close();
});

test("the popup's manual check gives the expected result", async () => {
  const page = await browser.newPage();
  await page.goto(`${PAGE}/`, { waitUntil: "load" });

  // The popup checks the active tab of its window. Opened as a tab it would
  // be that active tab itself, so run the same modules it uses against the
  // test page's tab instead.
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const lines = await popup.evaluate(async (url) => {
    const { inspectTab } = await import("./page-check.js");
    const { describeIssues } = await import("./issues.js");
    const [tab] = await chrome.tabs.query({ url });
    const inspection = await inspectTab(tab, { includeUrls: true });
    return {
      partial: inspection.partial,
      lines: describeIssues(inspection, { includePage: true }).map(
        ([key, substitutions]) => chrome.i18n.getMessage(key, substitutions)
      ),
    };
  }, `${PAGE}/`);

  assert.deepEqual(lines, { partial: false, lines: EXPECTED });
  await popup.close();
  await page.close();
});
