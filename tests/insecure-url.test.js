import test from "node:test";
import assert from "node:assert/strict";
import {
  collectInsecureUrls,
  countFindings,
  emptyFindings,
  isInsecureUrl,
  parseSrcset,
} from "../insecure-url.js";

const HTTPS_BASE = "https://example.com/section/page.html";
const HTTP_BASE = "http://example.com/section/page.html";

test("absolute http URLs are insecure", () => {
  assert.equal(isInsecureUrl("http://cdn.example.com/app.js", HTTPS_BASE), true);
});

test("absolute https URLs are secure", () => {
  assert.equal(isInsecureUrl("https://cdn.example.com/app.js", HTTPS_BASE), false);
});

test("relative URLs inherit the page protocol", () => {
  assert.equal(isInsecureUrl("images/logo.png", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("/styles/main.css", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("images/logo.png", HTTP_BASE), true);
});

test("protocol-relative URLs inherit the page protocol", () => {
  assert.equal(isInsecureUrl("//cdn.example.com/app.js", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("//cdn.example.com/app.js", HTTP_BASE), true);
});

test("non-http protocols are not flagged", () => {
  assert.equal(isInsecureUrl("mailto:someone@example.com", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("tel:+123456789", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("javascript:void(0)", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("ftp://example.com/file.zip", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("data:image/png;base64,AAAA", HTTPS_BASE), false);
});

test("fragments and query-only URLs resolve against the page", () => {
  assert.equal(isInsecureUrl("#section", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("?query=1", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("#section", HTTP_BASE), true);
});

test("empty or missing values are not flagged", () => {
  assert.equal(isInsecureUrl("", HTTPS_BASE), false);
  assert.equal(isInsecureUrl(null, HTTPS_BASE), false);
  assert.equal(isInsecureUrl(undefined, HTTPS_BASE), false);
});

test("unresolvable values are not flagged", () => {
  assert.equal(isInsecureUrl("http://[invalid", HTTPS_BASE), false);
  assert.equal(isInsecureUrl("relative/path.html", undefined), false);
});

test("uppercase scheme is still detected", () => {
  assert.equal(isInsecureUrl("HTTP://EXAMPLE.COM/APP.JS", HTTPS_BASE), true);
});

test("srcset candidates are split into their URLs", () => {
  assert.deepEqual(parseSrcset("small.png 1x, large.png 2x"), [
    "small.png",
    "large.png",
  ]);
  assert.deepEqual(parseSrcset("a.png 480w,b.png 800w"), ["a.png", "b.png"]);
  assert.deepEqual(parseSrcset("a.png, b.png,"), ["a.png", "b.png"]);
  // As in the HTML spec, a comma not followed by whitespace is part of the URL.
  assert.deepEqual(parseSrcset("a.png,b.png"), ["a.png,b.png"]);
  assert.deepEqual(parseSrcset("data:image/png;base64,AAAA 1x"), [
    "data:image/png;base64,AAAA",
  ]);
  assert.deepEqual(parseSrcset(""), []);
  assert.deepEqual(parseSrcset(undefined), []);
});

function page(documentUrl, entries) {
  return { documentUrl, baseUri: documentUrl, entries };
}

test("insecure URLs are grouped by kind and counted once", () => {
  const found = collectInsecureUrls(
    page(HTTPS_BASE, [
      { kind: "resources", value: "http://cdn.example.com/app.js" },
      { kind: "resources", value: "http://cdn.example.com/app.js" },
      { kind: "resources", value: "https://cdn.example.com/app.css" },
      { kind: "forms", value: "http://example.com/login" },
      { kind: "links", value: "http://other.example/#top" },
      { kind: "links", value: "http://other.example/#bottom" },
    ])
  );
  assert.deepEqual(countFindings(found), { resources: 1, forms: 1, links: 1 });
});

test("srcset entries contribute every candidate", () => {
  const found = collectInsecureUrls(
    page(HTTPS_BASE, [
      {
        kind: "resources",
        value:
          "http://a.example/1.png 1x, https://a.example/2.png 2x, http://a.example/3.png 3x",
        srcset: true,
      },
    ])
  );
  assert.equal(found.resources.size, 2);
});

test("on an HTTP page, its own origin is not counted again", () => {
  const found = collectInsecureUrls(
    page(HTTP_BASE, [
      { kind: "links", value: "#section" },
      { kind: "links", value: "/about" },
      { kind: "resources", value: "images/logo.png" },
      { kind: "resources", value: "http://cdn.example.net/app.js" },
    ])
  );
  assert.deepEqual(countFindings(found), { resources: 1, forms: 0, links: 0 });
});

test("findings accumulate across frames", () => {
  const found = emptyFindings();
  collectInsecureUrls(
    page(HTTPS_BASE, [{ kind: "resources", value: "http://a.example/x.js" }]),
    found
  );
  collectInsecureUrls(
    page("https://frame.example/", [
      { kind: "resources", value: "http://a.example/x.js" },
      { kind: "resources", value: "http://b.example/y.js" },
    ]),
    found
  );
  assert.equal(found.resources.size, 2);
});

test("unknown kinds and non-http documents are tolerated", () => {
  const found = collectInsecureUrls({
    documentUrl: "about:srcdoc",
    baseUri: HTTPS_BASE,
    entries: [
      { kind: "unknown", value: "http://a.example/" },
      { kind: "resources", value: "http://a.example/x.js" },
    ],
  });
  assert.deepEqual(countFindings(found), { resources: 1, forms: 0, links: 0 });
});
