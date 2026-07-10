import test from "node:test";
import assert from "node:assert/strict";
import { isInsecureUrl } from "../insecure-url.js";

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
