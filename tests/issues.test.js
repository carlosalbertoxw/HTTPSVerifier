import test from "node:test";
import assert from "node:assert/strict";
import { describeIssues } from "../issues.js";

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
    ["issueInsecureResources", ["2"]],
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
