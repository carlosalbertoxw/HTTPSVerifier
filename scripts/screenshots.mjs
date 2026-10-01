// Generates the Chrome Web Store screenshots (store-assets/shot-*.png, 1280x800)
// with headless Chrome. The texts of the popup and the notification come from
// _locales, so the screenshots match what the extension shows.
//
// Usage: npm run screenshots   (set CHROME_PATH if Chrome is not found)
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chrome) {
  throw new Error("Chrome not found: set CHROME_PATH to its executable.");
}

// Same substitution rules as chrome.i18n.getMessage for "$1"-style placeholders.
function message(locale, key, substitutions = []) {
  const messages = JSON.parse(
    readFileSync(path.join(ROOT, "_locales", locale, "messages.json"), "utf8")
  );
  const { message: text, placeholders = {} } = messages[key];
  return text.replace(/\$(\w+)\$/g, (match, name) => {
    const placeholder = placeholders[name.toLowerCase()];
    const index = Number(placeholder.content.slice(1)) - 1;
    return substitutions[index];
  });
}

const escape = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const icon = (size) =>
  pathToFileURL(path.join(ROOT, "images", `icon-${size}.png`)).href;

const STYLE = `
  * { box-sizing: border-box; }
  body {
    margin: 0; width: 640px; height: 400px; overflow: hidden; position: relative;
    font-family: "Segoe UI", Arial, sans-serif; color: #202124;
    background: linear-gradient(135deg, var(--bg-from), var(--bg-to));
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { width: 40px; height: 40px; }
  .brand span { font-size: 20px; font-weight: 700; color: var(--accent); }
  h1 { margin: 22px 0 10px; font-size: 26px; line-height: 1.25; }
  p { margin: 0; font-size: 13.5px; line-height: 1.6; color: #5f6368; }
  .window {
    background: #fff; border-radius: 12px; overflow: hidden;
    box-shadow: 0 12px 32px rgba(60, 64, 67, 0.18);
  }
  .toolbar {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 10px; background: #f1f3f4;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #dadce0; }
  .address {
    flex: 1; margin-left: 6px; padding: 3px 10px; font-size: 10px;
    background: #fff; border: 1px solid #dadce0; border-radius: 12px; color: #3c4043;
  }
  .address .warn { color: #c5221f; font-weight: 600; margin-right: 6px; }
  .toolbar img { width: 18px; height: 18px; }
  .popup header {
    display: flex; align-items: center; gap: 8px; padding: 12px 16px;
    background: #1a73e8; color: #fff; font-size: 14px; font-weight: 600;
  }
  .popup header img { width: 22px; height: 22px; }
  .popup main { padding: 8px 16px 14px; }
  .popup label {
    display: flex; gap: 8px; padding: 8px 0; font-size: 12px; line-height: 1.4;
  }
  .popup label + label { border-top: 1px solid #e8eaed; }
  .popup input { margin: 2px 0 0; accent-color: #1a73e8; }
  .popup button {
    width: 100%; margin-top: 10px; padding: 8px 0; border: none; border-radius: 6px;
    background: #1a73e8; color: #fff; font: 600 12px "Segoe UI", Arial, sans-serif;
  }
`;

function popup(locale, address) {
  return `
    <div class="window">
      <div class="toolbar">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="address">${escape(address)}</span>
        <img src="${icon(32)}" alt="">
      </div>
      <div class="popup">
        <header><img src="${icon(32)}" alt="">${escape(message(locale, "popupTitle"))}</header>
        <main>
          <label><input type="checkbox" checked>${escape(message(locale, "enableUrlNotifications"))}</label>
          <label><input type="checkbox" checked>${escape(message(locale, "enableLinkNotifications"))}</label>
          <button>${escape(message(locale, "checkNow"))}</button>
        </main>
      </div>
    </div>`;
}

function sideBySide({ colors, title, text, extra = "", right }) {
  return `
    <style>${STYLE}
      body { --bg-from: ${colors[0]}; --bg-to: ${colors[1]}; --accent: ${colors[2]};
             display: flex; align-items: center; gap: 28px; padding: 0 40px; }
      .left { width: 250px; flex: none; }
      .right { flex: 1; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
      .chips span {
        padding: 5px 12px; border-radius: 14px; background: #fff; font-size: 12px;
        font-weight: 600; color: var(--accent); box-shadow: 0 1px 4px rgba(60,64,67,.2);
      }
    </style>
    <div class="left">
      <div class="brand"><img src="${icon(48)}" alt=""><span>HTTPS Verifier</span></div>
      <h1>${title}</h1>
      <p>${text}</p>
      ${extra}
    </div>
    <div class="right">${right}</div>`;
}

const SHOTS = {
  "shot-1-popup-en": sideBySide({
    colors: ["#ffffff", "#e8f0fe", "#174ea6"],
    title: "Choose the alerts you want",
    text: "Turn each HTTPS check on or off from a simple popup — no configuration pages needed.",
    right: popup("en", "https://example.com"),
  }),

  "shot-2-notification-es": `
    <style>${STYLE}
      body { --bg-from: #fffdf6; --bg-to: #fdf1dc; --accent: #174ea6; }
      .page { position: absolute; left: 40px; top: 28px; width: 400px; }
      .content { padding: 16px 18px 6px; }
      .line { height: 10px; margin: 0 0 12px; border-radius: 5px; background: #e8eaed; }
      .line.red { background: #f6c3bf; }
      .text { position: absolute; left: 40px; bottom: 46px; width: 230px; }
      .text h1 { margin: 0 0 8px; font-size: 21px; }
      .notification {
        position: absolute; right: 26px; bottom: 30px; width: 320px; padding: 12px 16px;
        border-radius: 10px; background: #2d2e30; color: #e8eaed;
        box-shadow: 0 10px 28px rgba(0,0,0,.35); font-size: 12px; line-height: 1.6;
      }
      .notification .source { display: flex; align-items: center; gap: 8px; color: #bdc1c6; }
      .notification .source img { width: 18px; height: 18px; }
      .notification strong { display: block; margin: 8px 0 2px; font-size: 13px; color: #fff; }
    </style>
    <div class="page window">
      <div class="toolbar">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="address"><span class="warn">⚠ No es seguro</span>http://ejemplo.com</span>
        <img src="${icon(32)}" alt="">
      </div>
      <div class="content">
        <div class="line" style="width:45%;height:16px;margin-bottom:16px"></div>
        <div class="line" style="width:85%"></div>
        <div class="line red" style="width:52%"></div>
        <div class="line" style="width:68%"></div>
        <div class="line red" style="width:38%"></div>
      </div>
    </div>
    <div class="text">
      <h1>Alertas al instante</h1>
      <p>Recibe una notificación cuando una página, sus recursos o sus formularios no usen HTTPS.</p>
    </div>
    <div class="notification">
      <div class="source"><img src="${icon(32)}" alt="">Google Chrome · HTTPS Verifier</div>
      <strong>${escape(message("es", "notificationTitle", ["http://ejemplo.com"]))}</strong>
      <div>${escape(message("es", "issuePageNotHttps"))}</div>
      <div>${escape(message("es", "issueInsecureResources", ["2"]))}</div>
      <div>${escape(message("es", "issueInsecureForms", ["1"]))}</div>
    </div>`,

  "shot-3-languages-fr": sideBySide({
    colors: ["#ffffff", "#e6f4ea", "#137333"],
    title: "Disponible dans votre langue",
    text: "L'interface s'adapte automatiquement à la langue de votre navigateur.",
    extra: `<div class="chips"><span>English</span><span>Español</span><span>Français</span><span>Português</span></div>`,
    right: popup("fr", "https://exemple.fr"),
  }),
};

const workDir = mkdtempSync(path.join(os.tmpdir(), "https-verifier-shots-"));
try {
  for (const [name, body] of Object.entries(SHOTS)) {
    const html = path.join(workDir, `${name}.html`);
    writeFileSync(html, `<!doctype html><meta charset="utf-8">${body}`);
    const output = path.join(ROOT, "store-assets", `${name}.png`);
    execFileSync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--allow-file-access-from-files",
      "--force-device-scale-factor=2",
      "--window-size=640,400",
      `--user-data-dir=${path.join(workDir, "profile")}`,
      `--screenshot=${output}`,
      pathToFileURL(html).href,
    ]);
    console.log(path.relative(ROOT, output));
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
