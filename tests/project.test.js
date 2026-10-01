// Consistency checks across files that are easy to get out of sync by hand.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { HOST_PERMISSIONS, wantsAutomaticChecks } from "../settings.js";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = (path) => JSON.parse(read(path));

test("package.json and manifest.json declare the same version", () => {
  assert.equal(
    readJson("package.json").version,
    readJson("manifest.json").version
  );
});

test("access to all sites is optional and matches the code", () => {
  const manifest = readJson("manifest.json");
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.optional_host_permissions, HOST_PERMISSIONS.origins);
  assert.ok(manifest.permissions.includes("activeTab"));
  assert.ok(!manifest.permissions.includes("tabs"));
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
    /"(issue\w+)"/g,
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
