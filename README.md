# HTTPSVerifier

## Overview

This repository contains the source code for the HTTPS Verifier extension, which can be downloaded and installed from the following link:

https://chrome.google.com/webstore/detail/https-verifier/ogfgecooebcghjojlklphjjajaegcpen

The extension checks every page you visit and shows a desktop notification when:

- The page itself is not served over HTTPS.
- The page loads **resources** over insecure `http://`: images, scripts, stylesheets, frames, media, icons, fonts and anything loaded by scripts.
- **Forms** on the page send their data over `http://`.
- **Links** on the page point to `http://` pages.

Each kind is reported on its own line with the number of distinct insecure URLs found, including those inside frames. On a page that is itself served over HTTP, URLs of that same site are not counted again, because the first warning already covers them.

Each URL is notified at most once per tab while you stay on it (reloads included). Closing the tab or the browser resets this, so revisiting the page notifies again.

From the popup you can:

- Enable or disable each type of notification individually.
- Check the current page on demand with the **Check this page now** button. It always runs both checks and shows the result inside the popup, regardless of the notification settings.

### Permissions

Access to all sites is **optional**. The automatic notifications need it, because they check every page you visit, so the popup asks Chrome for it when you enable one of them. If both are turned off, the extension gives the access back. When notifications are enabled without access (for example right after installing, or after revoking it in `chrome://extensions`), the toolbar icon shows a **!** badge and the popup offers an **Allow access to sites** button.

**Check this page now** works without that access: opening the popup grants the [`activeTab`](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) permission for the current tab only. In that mode, frames embedded from other sites are not inspected, although their own address is still checked.

Requires Chrome 102 or later. Everything runs locally: see the [privacy policy](PRIVACY.md).

## Internationalization

The extension is localized with the [`chrome.i18n`](https://developer.chrome.com/docs/extensions/reference/api/i18n) API and automatically follows the browser's UI language. Supported languages:

- English (default)
- Español
- Français
- Português (Brasil)

Translations live in the `_locales/<lang>/messages.json` files. To add a new language, copy `_locales/en/messages.json` into a new folder named with the desired [locale code](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales) and translate the `message` values. A test checks that every locale has the same keys and placeholders.

## Project structure

| File | Purpose |
|------|---------|
| `manifest.json` | Manifest V3 definition (module service worker, localized name/description). |
| `background.js` | Service worker: watches page loads, applies the notification settings and deduplication, shows notifications. |
| `page-check.js` | Collects the URLs of every frame of a tab and classifies them. Used by the service worker and the popup. |
| `insecure-url.js` | Pure URL classification: insecure URLs grouped by kind, deduplicated (unit tested). |
| `issues.js` | Pure mapping from an inspection to the localized lines shown to the user (unit tested). |
| `settings.js` | Single source of truth for the settings keys and defaults. |
| `popup.html` / `popup.js` | Settings popup and on-demand page check. |
| `_locales/` | Translations (`chrome.i18n`). |
| `tests/` | Unit tests (`node:test`). |
| `scripts/build.mjs` | Builds the Chrome Web Store ZIP. |
| `store-assets/` | Chrome Web Store screenshots and listing descriptions (not part of the packaged extension). |
| `.github/` | CI, CodeQL and Dependabot configuration. |

## Development

Requirements: Node.js 20.19, 22.13 or 24+ (for the tooling only; the extension has no runtime dependencies).

1. Clone this repository and run `npm ci`.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.

```
npm run lint   # ESLint
npm test       # unit tests (node:test)
npm run build  # dist/https-verifier-<version>.zip
```

CI runs the same commands on every push and pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the conventions and [CHANGELOG.md](CHANGELOG.md) for the version history.

## Publishing to the Chrome Web Store

### 1. Build the ZIP

```
npm run build
```

This creates `dist/https-verifier-<version>.zip` with `manifest.json` at the root and **only the files the extension needs at runtime** (the list is `PACKAGE_ENTRIES` in `scripts/build.mjs`). The build fails if a packaged file references another file that is not packaged. Pushing a `v<version>` tag also builds it in CI and attaches it to a GitHub release.

Before packaging, make sure the `version` in `manifest.json` (and `package.json`) is **higher** than the one currently published, because the store rejects uploads with the same or a lower version. Tag every published version (`git tag v1.3.0`): the store has no rollback, so going back means republishing the code of an older tag with a higher version number.

### 2. Upload and fill in the listing

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Publishing requires a developer account with the one-time $5 registration fee.
2. Select the existing **HTTPS Verifier** item (or **New item** for a first publish) and upload the ZIP under **Package → Upload new package**.
3. In **Store listing**, fill in the detailed description. The ready-to-paste texts live in `store-assets/description-{en,es,fr,pt_BR}.txt`. Because the extension declares `_locales`, the dashboard lets you provide the listing in each supported language, and the short description under the name is taken automatically from the localized `manifest.json`.
4. Upload at least one screenshot (640×400 or 1280×800 JPEG/PNG). The ready-made ones live in `store-assets/*.jpg`.

### 3. Privacy declarations

In the **Privacy** tab you must justify every permission. For this extension:

- `activeTab` + `scripting`: the on-demand check reads the URLs of the resources, forms and links of the current tab, only when the user opens the popup.
- Optional host permissions (`http://*/*`, `https://*/*`): requested at runtime only if the user enables the automatic notifications, which check every visited page. They are released when both notifications are turned off.
- `notifications`: needed to alert the user about insecure pages/resources.
- `storage`: stores the user's notification preferences locally.
- Data usage: the extension collects **no** user data, and everything runs locally. Link the [privacy policy](PRIVACY.md) as the privacy policy URL.

### 4. Submit for review

Click **Submit for review**. Review usually takes from a few hours to a few days. Once approved, the new version rolls out automatically to existing users.

> Note for the release that makes host permissions optional: check in a real update (not only a fresh install) whether existing users keep their access. If Chrome drops it, they will see the **!** badge and must allow access once from the popup. Mention this in the release notes.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

## Motivation

I created this extension just for fun and out of curiosity to learn how extensions are made and published.

## Technologies

- JavaScript
- HTML
- CSS
