// Consistency checks across files that are easy to get out of sync by hand.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { wantsAutomaticChecks } from "../settings.js";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = (path) => JSON.parse(read(path));

test("package.json and manifest.json declare the same version", () => {
  assert.equal(
    readJson("package.json").version,
    readJson("manifest.json").version
  );
});

// Changing permissions disables the extension for existing users until they
// accept the new warning, so any change here must be deliberate (see the
// "Permissions" section of the README).
test("the permissions are the documented ones", () => {
  const manifest = readJson("manifest.json");
  assert.deepEqual(manifest.permissions, [
    "scripting",
    "notifications",
    "storage",
  ]);
  assert.deepEqual(manifest.host_permissions, ["http://*/*", "https://*/*"]);
  assert.equal(manifest.optional_host_permissions, undefined);
});

test("automatic checks are wanted when any notification is enabled", () => {
  const settings = (url, links) => ({
    enableNotificationsURL: url,
    enableNotificationsLINKS: links,
  });
  assert.equal(wantsAutomaticChecks(settings(true, false)), true);
  assert.equal(wantsAutomaticChecks(settings(false, true)), true);
  assert.equal(wantsAutomaticChecks(settings(false, false)), false);
});

const locales = readdirSync(new URL("../_locales/", import.meta.url));
const messages = Object.fromEntries(
  locales.map((locale) => [
    locale,
    readJson(`_locales/${locale}/messages.json`),
  ])
);

test("every locale defines the same messages and placeholders", () => {
  const reference = messages.en;
  for (const locale of locales) {
    assert.deepEqual(
      Object.keys(messages[locale]).sort(),
      Object.keys(reference).sort(),
      `keys of ${locale}`
    );
    for (const [key, { placeholders }] of Object.entries(reference)) {
      assert.deepEqual(
        Object.keys(messages[locale][key].placeholders || {}),
        Object.keys(placeholders || {}),
        `placeholders of ${locale}/${key}`
      );
    }
  }
});

test("every message used by the code exists", () => {
  const sources = [
    "background.js",
    "issues.js",
    "popup.js",
    "popup.html",
    "manifest.json",
  ]
    .map(read)
    .join("\n");
  const used = new Set();
  for (const pattern of [
    /getMessage\(\s*"(\w+)"/g,
    /data-i18n="(\w+)"/g,
    /__MSG_(\w+)__/g,
    // Message keys passed around as [key, substitutions] (not element ids).
    /(?<!getElementById\(|id=)"((?:issue|check|frames|resources)[A-Z]\w*)"/g,
  ]) {
    for (const [, key] of sources.matchAll(pattern)) {
      used.add(key);
    }
  }
  assert.ok(used.size > 10);
  for (const key of used) {
    assert.ok(messages.en[key], `missing message "${key}"`);
  }
});
