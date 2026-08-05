# HTTPSVerifier

## Overview

This repository contains the source code for the HTTPS Verifier extension, which can be downloaded and installed from the following link:

https://chrome.google.com/webstore/detail/https-verifier/ogfgecooebcghjojlklphjjajaegcpen

The extension checks every page you visit and shows a desktop notification when:

- The page itself is not served over HTTPS.
- Links, images, stylesheets, or scripts on the page point to insecure `http://` URLs (the notification includes how many were found).

Each URL is notified at most once per tab while you stay on it (reloads included); closing the tab or the browser resets this, so revisiting the page notifies again.

From the popup you can:

- Enable or disable each type of notification individually.
- Check the current page on demand with the **Check this page now** button — it always runs both checks and shows the result inside the popup, regardless of the notification settings.

## Internationalization

The extension is localized with the [`chrome.i18n`](https://developer.chrome.com/docs/extensions/reference/api/i18n) API and automatically follows the browser's UI language. Supported languages:

- English (default)
- Español
- Français
- Português (Brasil)

Translations live in the `_locales/<lang>/messages.json` files. To add a new language, copy `_locales/en/messages.json` into a new folder named with the desired [locale code](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales) and translate the `message` values.

## Project structure

| File | Purpose |
|------|---------|
| `manifest.json` | Manifest V3 definition (module service worker, localized name/description). |
| `background.js` | Service worker: watches page loads, applies the notification settings and deduplication, shows notifications. |
| `page-check.js` | Shared inspection logic: collects the URLs from a tab and classifies them. Used by the service worker and the popup. |
| `insecure-url.js` | Pure URL classification function (unit tested). |
| `settings.js` | Single source of truth for the settings keys and defaults. |
| `popup.html` / `popup.js` | Settings popup and on-demand page check. |
| `_locales/` | Translations (`chrome.i18n`). |
| `tests/` | Unit tests (`node:test`, no dependencies). |
| `store-assets/` | Chrome Web Store screenshots and listing descriptions (not part of the packaged extension). |

## Development

1. Clone this repository.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.

### Tests

The URL classification logic (`insecure-url.js`) has unit tests that run with Node.js (no dependencies):

```
npm test
```

## Publishing to the Chrome Web Store

### 1. Build the ZIP

The package must contain **only the files the extension needs at runtime**, with `manifest.json` at the root of the ZIP (not inside a subfolder):

```
https-verifier-1.1.0.zip
├── manifest.json
├── background.js
├── page-check.js
├── insecure-url.js
├── settings.js
├── popup.html
├── popup.js
├── _locales/
│   ├── en/messages.json
│   ├── es/messages.json
│   ├── fr/messages.json
│   └── pt_BR/messages.json
└── images/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-128.png
```

Do **not** include: `tests/`, `store-assets/`, `package.json`, `README.md`, or the `.git` folder. On Windows you can build it from the project root with:

```powershell
Compress-Archive -Force -DestinationPath https-verifier-1.1.0.zip -Path manifest.json, background.js, page-check.js, insecure-url.js, settings.js, popup.html, popup.js, _locales, images
```

Before packaging, make sure the `version` in `manifest.json` is **higher** than the one currently published — the store rejects uploads with the same or a lower version.

### 2. Upload and fill in the listing

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (publishing requires a developer account with the one-time $5 registration fee).
2. Select the existing **HTTPS Verifier** item (or **New item** for a first publish) and upload the ZIP under **Package → Upload new package**.
3. In **Store listing**, fill in the detailed description — the ready-to-paste texts live in `store-assets/description-{en,es,fr,pt_BR}.txt`. Because the extension declares `_locales`, the dashboard lets you provide the listing in each supported language; the short description under the name is taken automatically from the localized `manifest.json`.
4. Upload at least one screenshot (640×400 or 1280×800 JPEG/PNG). The ready-made ones live in `store-assets/*.jpg`.

### 3. Privacy declarations

In the **Privacy** tab you must justify every permission. For this extension:

- `scripting` + host permissions (`http://*/*`, `https://*/*`): needed to read the links/resources of the visited page to verify they use HTTPS.
- `notifications`: needed to alert the user about insecure pages/resources.
- `storage`: stores the user's notification preferences locally.
- Data usage: the extension collects **no** user data; everything runs locally.

### 4. Submit for review

Click **Submit for review**. Review usually takes from a few hours to a few days; broad host permissions can make it take longer. Once approved, the new version rolls out automatically to existing users.

> Note for the 1.1.0 update: this version **removes** the `tabs` permission. Permission reductions do not require re-approval from users, but mention it in the reviewer notes if asked.

## Motivation

I created this extension just for fun and out of curiosity to learn how extensions are made and published.

## Technologies

- Javascript
- HTML
- CSS
