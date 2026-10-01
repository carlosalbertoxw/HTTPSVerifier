# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). The version lives in both
`manifest.json` and `package.json` (a test checks they match).

## [Unreleased]

### Changed
- Access to all sites is now optional (`optional_host_permissions`). The popup
  requests it when an automatic notification is enabled and releases it when
  both are turned off. "Check this page now" works without it through
  `activeTab`. Users without access see a "!" badge on the toolbar icon and an
  "Allow access to sites" button in the popup.
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
- ESLint, `.editorconfig`, more unit tests (service worker logic, frame
  merging, locale consistency).

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

[Unreleased]: https://github.com/carlosalbertoxw/HTTPSVerifier/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/carlosalbertoxw/HTTPSVerifier/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/carlosalbertoxw/HTTPSVerifier/compare/v1.0.1...v1.2.0
[1.0.1]: https://github.com/carlosalbertoxw/HTTPSVerifier/compare/1.0.0...v1.0.1
[1.0.0]: https://github.com/carlosalbertoxw/HTTPSVerifier/releases/tag/1.0.0
