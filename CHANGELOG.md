# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). The version lives in both
`manifest.json` and `package.json` (a test checks they match).

## [Unreleased]

### Changed
- Insecure resources are reported as resources that "use HTTP addresses"
  instead of resources that "load over HTTP". On an HTTPS page the line adds
  that Chrome blocks them or tries to load them over HTTPS (mixed content), so
  it no longer claims they were loaded insecurely. The store descriptions say
  the same.
- Each tab has a single notification: a new one for the same tab replaces the
  previous one, and closing the tab removes it. Before, two notifications
  created in the same millisecond could replace each other.

### Tooling
- End-to-end test (`npm run test:e2e`): loads the packaged files in Chrome for
  Testing with Puppeteer and checks the notification and the manual check
  against the test page. CI runs it as a separate, non-blocking job.
- Reproducible build on every OS: `.gitattributes` forces LF line endings
  (on Windows with `core.autocrlf` the ZIP used to differ from the CI one).
- GitHub releases get a signed build provenance attestation of the ZIP
  (`gh attestation verify`).
- GitHub Actions pinned by commit SHA, without persisted credentials.
- Node.js 20 (end of life) dropped from the supported versions, `.nvmrc`
  added, and CI moved to Node.js 24.
- Incident response steps for the maintainer in `SECURITY.md`.
- Manual test page with a known expected result: `npm run test-page`, then
  open http://localhost:8080/ (see "Manual test page" in the README).
- README section on known detection limitations, such as resources loaded by
  stylesheets from another site.

## [1.4.0] - 2026-10-01

The permissions are the same as in 1.3.0, so updating does not show any new
permission warning.

### Changed
- Issues are reported per kind: resources loaded over HTTP, forms that send data
  over HTTP, and links to HTTP pages, instead of a single "link(s) or
  resource(s)" count.
- Each insecure URL is counted once (duplicates and `#fragments` collapse).
- On HTTP pages, URLs of the page's own origin are no longer counted: the
  "page does not use HTTPS" warning already covers them.

### Added
- Detection of frames, media (`video`, `audio`, `source`, `track`, posters),
  `srcset`, `embed`/`object`, icons, preloads, web manifests, form `action` and
  `formaction`.
- Detection of what the page actually loaded (Resource Timing), which covers CSS
  `url()`, fonts and resources added by scripts.
- Inspection of every frame of the page, not only the top one.
- `minimum_chrome_version` 102 in the manifest (required by
  `chrome.storage.session`).
- If the page cannot be injected into every frame, the top frame is still
  checked, and the popup says that some frames could not be checked instead of
  "everything uses HTTPS".

### Fixed
- Duplicate notifications when several tabs finished loading at the same time
  or a tab fired "complete" twice.
- `npm test` failing on Node.js 21+ (`node --test` no longer accepts a folder).
- The debug log of a failed inspection included the full URL; it now logs only
  the origin, like the notifications.

### Tooling
- CI on GitHub Actions (lint, tests, `npm audit`, package build, GitHub release
  on `v*` tags), CodeQL and Dependabot.
- `npm run build` creates the Chrome Web Store ZIP from a single file list and
  fails if a packaged file references one that is not packaged.
- ESLint, Prettier, `.editorconfig`, more unit tests (the service worker
  driven through its events, frame merging, locale consistency, permissions).
- Tags with a suffix (`v1.4.0-rc.1`) create a GitHub pre-release, to rehearse
  a release. GitHub releases take their notes from this changelog.
- Store screenshots regenerated at 1280×800 with `npm run screenshots`, from
  the texts in `_locales`; the language screenshot now includes Portuguese.

## [1.3.0] - 2026-08-05

### Added
- Brazilian Portuguese (pt_BR) localization and store listing.

## [1.2.0] - 2026-07-10

### Added
- Localization with `chrome.i18n`: English, Spanish and French.
- "Check this page now" button in the popup.
- Unit tests for the URL classification (`node:test`).
- Chrome Web Store screenshots and listing texts.

### Changed
- A URL is notified at most once per tab while the user stays on it.
- Notifications show only the origin of the page, never the full URL.
- Relative and protocol-relative URLs are resolved against the page, so they
  are classified correctly.
- The service worker is an ES module; the settings live in a single module.

### Removed
- The `tabs` permission (first planned as 1.1.0, which was not committed
  separately).

## [1.0.1] - 2023-08-19

### Changed
- Texts and code comments translated to English.

## [1.0.0] - 2023-04-15

### Added
- First version: desktop notifications when the page is not served over HTTPS
  or when links, images, stylesheets or scripts use `http://`, with a popup to
  enable each notification type.

[Unreleased]: https://github.com/carlosalbertoxw/HTTPSVerifier/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/carlosalbertoxw/HTTPSVerifier/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/carlosalbertoxw/HTTPSVerifier/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/carlosalbertoxw/HTTPSVerifier/compare/v1.0.1...v1.2.0
[1.0.1]: https://github.com/carlosalbertoxw/HTTPSVerifier/compare/1.0.0...v1.0.1
[1.0.0]: https://github.com/carlosalbertoxw/HTTPSVerifier/releases/tag/1.0.0
