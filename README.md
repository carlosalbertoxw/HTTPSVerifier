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

The extension asks for access to all `http://` and `https://` sites at install time (`host_permissions`). This is a deliberate decision:

- **Why:** the main feature is checking every page you visit automatically, so almost every user would need that access anyway.
- **Alternative considered (and reverted):** making the access optional (`optional_host_permissions`) and requesting it from the popup, with `activeTab` for the manual check. It avoids the install warning, but it added permission prompts, a "missing access" badge and notice, and it broke the automatic notifications for users who restrict the extension to specific sites from Chrome's site access menu.
- **What the access is used for:** only to read the URLs of the page's resources, forms and links, locally. See the [privacy policy](PRIVACY.md).

You can still limit the extension to specific sites from Chrome's site access menu: the automatic checks then run only on those sites.

If an injection into some frame of the page fails, the page itself is still checked and the popup says that some frames could not be checked, instead of reporting that everything uses HTTPS.

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
| `tests/` | Unit tests (`node:test`). `tests/manual/` holds the manual test page (`npm run test-page`). |
| `scripts/build.mjs` | Builds the Chrome Web Store ZIP. |
| `scripts/screenshots.mjs` / `scripts/release-notes.mjs` | Store screenshots and GitHub release notes. |
| `store-assets/` | Chrome Web Store screenshots and listing descriptions (not part of the packaged extension). |
| `.github/` | CI, CodeQL and Dependabot configuration. |

## Development

Requirements: Node.js 20.19, 22.13 or 24+ (for the tooling only; the extension has no runtime dependencies).

1. Clone this repository and run `npm ci`.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.

```
npm run lint          # ESLint
npm run format:check  # Prettier (npm run format to fix)
npm test              # unit tests (node:test)
npm run build         # dist/https-verifier-<version>.zip
```

CI runs the same commands on every push and pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the conventions and [CHANGELOG.md](CHANGELOG.md) for the version history.

### Manual test page

To try the extension in Chrome on a page with a known result:

1. Load the extension as described above (or click the reload icon of the extension in `chrome://extensions` after changing the code).
2. Start the test page:

   ```
   npm run test-page
   ```

3. Open http://localhost:8080/ in Chrome. Keep the terminal open; press `Ctrl+C` to stop the server.

The page is served from `http://localhost:8080` and loads its resources from a second origin, `http://127.0.0.1:8081`, so they count as resources from another site. It covers images, `srcset`, scripts, a script-added image, stylesheets, a CSS `@import`, a video poster, an iframe from another site (with its own image and form), forms and links, plus cases that must **not** be counted. The expected result is shown at the top of the page:

- The page does not use HTTPS.
- 10 resource(s) (images, scripts, styles, frames…) load over HTTP.
- 2 form(s) send data over HTTP.
- 2 link(s) point to HTTP pages.

Check it both ways: the notification shown when the page loads, and **Check this page now** in the popup. Reloading the tab must not notify again; the "another URL" link on the page must.

For HTTPS pages with mixed content, use the public pages of [badssl.com](https://badssl.com/), for example https://mixed.badssl.com/ (image), https://mixed-script.badssl.com/ (script), https://mixed-form.badssl.com/ (form) and https://very.badssl.com/ (several kinds), and http://http.badssl.com/ for a page that is not served over HTTPS.

### Known limitations

- **Resources loaded by a stylesheet from another site** (its `@import` and `url()`) are not detected: Chrome leaves them out of the Resource Timing data that the extension reads, and they are not in the page's markup. The stylesheet itself is detected.
- Chrome keeps only the first 250 Resource Timing entries of a page; resources loaded after that are detected only if they are in the page's markup.
- An image used only as a CSS background is requested (and detected) only once Chrome renders it.

## Publishing to the Chrome Web Store

### 1. Build the ZIP

```
npm run build
```

This creates `dist/https-verifier-<version>.zip` with `manifest.json` at the root and **only the files the extension needs at runtime** (the list is `PACKAGE_ENTRIES` in `scripts/build.mjs`). The build fails if a packaged file references another file that is not packaged. Pushing a `v<version>` tag also builds it in CI and attaches it to a GitHub release. To rehearse a release, push a tag with a suffix such as `v1.4.0-rc.1` (with `1.4.0` in the manifest): it is published as a pre-release that you can delete afterwards.

Before packaging, make sure the `version` in `manifest.json` (and `package.json`) is **higher** than the one currently published, because the store rejects uploads with the same or a lower version. Tag every published version (`git tag v1.3.0`): the store has no rollback, so going back means republishing the code of an older tag with a higher version number.

### 2. Upload and fill in the listing

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Publishing requires a developer account with the one-time $5 registration fee.
2. Select the existing **HTTPS Verifier** item (or **New item** for a first publish) and upload the ZIP under **Package → Upload new package**.
3. In **Store listing**, fill in the detailed description. The ready-to-paste texts live in `store-assets/description-{en,es,fr,pt_BR}.txt`. Because the extension declares `_locales`, the dashboard lets you provide the listing in each supported language, and the short description under the name is taken automatically from the localized `manifest.json`.
4. Upload at least one screenshot (640×400 or 1280×800 JPEG/PNG). The ready-made ones live in `store-assets/*.png` (1280×800). They are generated with headless Chrome from the texts in `_locales`, so regenerate them with `npm run screenshots` whenever the popup or the notification texts change (set `CHROME_PATH` if Chrome is not found).

### 3. Privacy declarations

In the **Privacy** tab you must justify every permission. For this extension:

- `scripting` + host permissions (`http://*/*`, `https://*/*`): needed to read the URLs of the resources, forms and links of the visited page to verify they use HTTPS.
- `notifications`: needed to alert the user about insecure pages/resources.
- `storage`: stores the user's notification preferences locally.
- Data usage: the extension collects **no** user data, and everything runs locally. Link the [privacy policy](PRIVACY.md) as the privacy policy URL.

### 4. Submit for review

Click **Submit for review**. Review usually takes from a few hours to a few days, and broad host permissions can make it take longer. Once approved, the new version rolls out automatically to existing users.

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
