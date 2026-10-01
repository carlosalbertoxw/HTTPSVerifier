import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { releaseNotes } from "../scripts/release-notes.mjs";

const CHANGELOG = `# Changelog

## [Unreleased]

## [1.4.0] - 2026-10-01

Intro.

### Added
- New thing.

## [1.3.0] - 2026-08-05

### Added
- Old thing.

[Unreleased]: https://example.com/compare/v1.4.0...HEAD
[1.4.0]: https://example.com/compare/v1.3.0...v1.4.0
`;

test("returns only the section of the requested version", () => {
  assert.equal(
    releaseNotes(CHANGELOG, "1.4.0"),
    "Intro.\n\n### Added\n- New thing."
  );
});

test("the last section stops at the link references", () => {
  assert.equal(releaseNotes(CHANGELOG, "1.3.0"), "### Added\n- Old thing.");
});

test("an unknown version has no notes", () => {
  assert.equal(releaseNotes(CHANGELOG, "9.9.9"), null);
  // "1.4" must not match the "1.4.0" heading.
  assert.equal(releaseNotes(CHANGELOG, "1.4"), null);
});

test("Windows line endings are handled", () => {
  assert.equal(
    releaseNotes(CHANGELOG.replace(/\n/g, "\r\n"), "1.3.0"),
    "### Added\n- Old thing."
  );
});

test("the changelog documents the version in the manifest", () => {
  const read = (path) =>
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { version } = JSON.parse(read("manifest.json"));
  assert.ok(
    releaseNotes(read("CHANGELOG.md"), version),
    `CHANGELOG.md has no section for ${version}`
  );
});
