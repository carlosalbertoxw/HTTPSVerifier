// Manual test page for the extension: `npm run test-page`, then open
// http://localhost:8080/ in Chrome with the extension loaded.
//
// The page is served from http://localhost:8080 and loads its resources from a
// second origin, http://127.0.0.1:8081, so they count as cross-origin HTTP
// resources (URLs of the page's own origin are skipped on HTTP pages). The
// expected result is shown on the page itself.
import http from "node:http";

const PAGE = "http://localhost:8080";
const ASSETS = "http://127.0.0.1:8081";

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

const EXPECTED = [
  "The page does not use HTTPS.",
  "10 resource(s) (images, scripts, styles, frames…) load over HTTP.",
  "2 form(s) send data over HTTP.",
  "2 link(s) point to HTTP pages.",
];

const INDEX = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>HTTPS Verifier test page</title>
  <link rel="stylesheet" href="${ASSETS}/styles.css">
  <link rel="stylesheet" href="/local.css">
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; max-width: 760px; margin: 24px auto; padding: 0 16px; color: #202124; }
    code { background: #f1f3f4; padding: 1px 4px; border-radius: 4px; }
    .expected { background: #e8f0fe; padding: 12px 16px; border-radius: 8px; }
    td, th { text-align: left; padding: 2px 12px 2px 0; vertical-align: top; }
    iframe { width: 100%; height: 120px; border: 1px solid #dadce0; }
  </style>
</head>
<body>
  <h1>HTTPS Verifier test page</h1>
  <div class="expected">
    <strong>Expected result</strong> (popup "Check this page now", and the notification on load):
    <ul>${EXPECTED.map((line) => `<li>${line}</li>`).join("")}</ul>
    Reloading this tab must not notify again. Navigating to <a href="/?again">another URL</a> notifies again.
  </div>

  <h2>Resources (10 distinct insecure URLs)</h2>
  <table>
    <tr><th>1</th><td><code>img[src]</code></td><td><img src="${ASSETS}/a.png" alt="" width="16" height="16"></td></tr>
    <tr><th>2-3</th><td><code>img[srcset]</code>, two candidates</td><td><img srcset="${ASSETS}/b.png 1x, ${ASSETS}/c.png 2x" alt="" width="16" height="16"></td></tr>
    <tr><th>4</th><td><code>script[src]</code></td><td>loads <code>d.js</code>...</td></tr>
    <tr><th>5</th><td>image added by that script (Resource Timing only)</td><td id="dynamic"></td></tr>
    <tr><th>6</th><td><code>link[rel=stylesheet]</code></td><td>loads <code>styles.css</code>...</td></tr>
    <tr><th>7</th><td>CSS <code>@import url()</code> in a same-origin stylesheet (Resource Timing only)</td><td><span class="css-import">imported.css, imported by local.css</span></td></tr>
    <tr><th>8</th><td><code>iframe[src]</code> from another site</td><td>see below</td></tr>
    <tr><th>9</th><td><code>video[poster]</code></td><td><video poster="${ASSETS}/i.png" width="32" height="16"></video></td></tr>
    <tr><th>10</th><td>image inside the iframe</td><td>see below</td></tr>
  </table>
  <p>Not counted: <img src="/same-origin.png" alt="" width="16" height="16"> a same-origin image on this HTTP page,
     <img src="https://www.gstatic.com/images/branding/product/1x/chrome_16dp.png" alt="" width="16" height="16"> an HTTPS image,
     and (known limitation) <code>not-reported.css</code>, imported by the cross-origin <code>styles.css</code>: Chrome does not report what cross-origin stylesheets load.</p>

  <h2>Forms (2)</h2>
  <form action="${ASSETS}/submit" onsubmit="return false"><input placeholder="form on this page"> <button>Send</button></form>
  <p>The second one is inside the iframe.</p>

  <h2>Links (2)</h2>
  <ul>
    <li><a href="${ASSETS}/page">HTTP link to another site</a></li>
    <li><a href="http://example.com/">http://example.com/</a></li>
    <li>Not counted: <a href="/about">same-origin link</a>, <a href="https://example.com/">HTTPS link</a>, <a href="#top">fragment</a>.</li>
  </ul>

  <h2>Iframe from ${ASSETS}</h2>
  <iframe src="${ASSETS}/frame.html"></iframe>

  <script src="${ASSETS}/d.js"></script>
</body>
</html>`;

// The frame's own origin is 127.0.0.1:8081, so its resources must come from
// somewhere else to count: they point back to localhost:8080.
const FRAME = `<!doctype html>
<meta charset="utf-8">
<body style="font-family: Segoe UI, Arial, sans-serif; font-size: 13px">
  Iframe from ${ASSETS}: image <img src="${PAGE}/h.png" alt="" width="16" height="16"> (resource 10) and
  <form action="${PAGE}/login" style="display:inline" onsubmit="return false"><button>a form</button></form> (form 2).
</body>`;

const ASSET_FILES = {
  "/d.js": [
    "text/javascript",
    `const img = document.createElement("img");
img.src = "${ASSETS}/e.png"; img.width = 16; img.height = 16;
document.getElementById("dynamic").appendChild(img);`,
  ],
  // Chrome leaves out of Resource Timing what a cross-origin stylesheet loads
  // (known limitation, see the README), so this @import is not counted.
  "/styles.css": ["text/css", `@import url("not-reported.css");`],
  "/not-reported.css": ["text/css", `.not-reported { color: inherit; }`],
  // Served from the page's own origin, so its @import is reported. An @import
  // is always fetched; a background image is not while the tab is hidden,
  // which would make the expected count unreliable.
  "/local.css": ["text/css", `@import url("${ASSETS}/imported.css");`],
  "/imported.css": ["text/css", `.css-import { font-style: italic; }`],
  "/frame.html": ["text/html; charset=utf-8", FRAME],
};

function handler(req, res) {
  // Never cached: every load must request every resource again.
  res.setHeader("cache-control", "no-store");
  const path = req.url.split("?")[0];
  const file = ASSET_FILES[path];
  if (file) {
    res.writeHead(200, { "content-type": file[0] });
    return res.end(file[1]);
  }
  if (path === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(INDEX);
  }
  if (path.endsWith(".png")) {
    res.writeHead(200, { "content-type": "image/png" });
    return res.end(PNG);
  }
  // Any other path (the test links) gets a placeholder page. Plain text, so
  // the requested path is never interpreted as HTML.
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end(`${path}\n\nBack to the test page: ${PAGE}/\n`);
}

http.createServer(handler).listen(8080, "localhost");
http.createServer(handler).listen(8081, "127.0.0.1");

console.log(`Test page: ${PAGE}/  (resources from ${ASSETS})`);
console.log("Expected result:");
for (const line of EXPECTED) {
  console.log(`  - ${line}`);
}
console.log("Press Ctrl+C to stop.");
