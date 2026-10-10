import test from "node:test";
import assert from "node:assert/strict";
import { MAX_URLS_PER_KIND } from "../insecure-url.js";
import { describeIssues, describeResult } from "../issues.js";

test("an insecure page is reported only when requested", () => {
  const inspection = { pageInsecure: true, insecureCounts: null };
  assert.deepEqual(describeIssues(inspection, { includePage: true }), [
    ["issuePageNotHttps", []],
  ]);
  assert.deepEqual(describeIssues(inspection, { includePage: false }), []);
});

test("each kind with findings gets its own line, in a fixed order", () => {
  const inspection = {
    pageInsecure: false,
    insecureCounts: { resources: 2, forms: 0, links: 5 },
  };
  assert.deepEqual(describeIssues(inspection, { includePage: true }), [
    ["issueMixedResources", ["2"]],
    ["issueInsecureLinks", ["5"]],
  ]);
});

test("a secure page has no issues", () => {
  const inspection = {
    pageInsecure: false,
    insecureCounts: { resources: 0, forms: 0, links: 0 },
  };
  assert.deepEqual(describeIssues(inspection, { includePage: true }), []);
});

test("resources on an HTTPS page say that Chrome blocks or upgrades them", () => {
  const counts = { resources: 3, forms: 1, links: 0 };
  assert.deepEqual(
    describeIssues(
      { pageInsecure: false, insecureCounts: counts },
      { includePage: true }
    ),
    [
      ["issueMixedResources", ["3"]],
      ["issueInsecureForms", ["1"]],
    ]
  );
  assert.deepEqual(
    describeIssues(
      { pageInsecure: true, insecureCounts: counts },
      { includePage: false }
    ),
    [
      ["issueInsecureResources", ["3"]],
      ["issueInsecureForms", ["1"]],
    ]
  );
});

const CHECKED = { resources: 0, forms: 0, links: 0 };

test("the manual check says when a page cannot be checked", () => {
  assert.deepEqual(describeResult(null), {
    tone: "muted",
    lines: [["checkNotPossible", []]],
  });
});

test("only a complete check without issues reads as all HTTPS", () => {
  const inspection = {
    pageInsecure: false,
    insecureCounts: CHECKED,
    partial: false,
    truncated: false,
  };
  assert.deepEqual(describeResult(inspection), {
    tone: "ok",
    lines: [["checkResultOk", []]],
  });
  // Any note turns "everything uses HTTPS" into a muted result.
  for (const [change, note] of [
    [{ insecureCounts: null }, ["resourcesNotChecked", []]],
    [{ partial: true }, ["checkResultPartial", []]],
    [{ truncated: true }, ["urlsTruncated", [String(MAX_URLS_PER_KIND)]]],
  ]) {
    assert.deepEqual(describeResult({ ...inspection, ...change }), {
      tone: "muted",
      lines: [note],
    });
  }
});

test("issues come first, followed by what could not be checked", () => {
  assert.deepEqual(
    describeResult({
      pageInsecure: true,
      insecureCounts: { ...CHECKED, links: 2 },
      partial: true,
      truncated: true,
    }),
    {
      tone: "warn",
      lines: [
        ["issuePageNotHttps", []],
        ["issueInsecureLinks", ["2"]],
        ["framesNotChecked", []],
        ["urlsTruncated", [String(MAX_URLS_PER_KIND)]],
      ],
    }
  );
  assert.deepEqual(
    describeResult({
      pageInsecure: true,
      insecureCounts: null,
      partial: false,
      truncated: false,
    }),
    {
      tone: "warn",
      lines: [
        ["issuePageNotHttps", []],
        ["resourcesNotChecked", []],
      ],
    }
  );
});
