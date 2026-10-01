# Privacy policy

_Last updated: 2026-09-30_

HTTPS Verifier does not collect, sell or share any data. Everything it does
happens locally in your browser, and it makes no network requests of its own.

## What the extension reads

- **The address of the tab**, to know whether the page uses HTTPS.
- **The addresses in the page.** When the resource check is enabled, it reads
  the addresses of the page's resources (images, scripts, styles, frames and
  media), forms and links, plus the list of resources the page loaded. It uses
  them only to count how many use `http://`. It reads no text, form values,
  cookies or passwords.

Access to all `http://` and `https://` sites is optional. It is requested
only when you enable the automatic notifications, which check every page you
visit, and it is given back when you turn them off. The on-demand check in
the popup only accesses the current tab, and only when you open the popup.

## What the extension stores

- **Your preferences** (which notifications are enabled), in
  `chrome.storage.local`, on your device.
- **The last address notified in each tab**, in `chrome.storage.session`, to
  avoid repeating the same notification. Chrome keeps it in memory only. It is
  deleted when the tab or the browser is closed.

Notifications show only the site's origin (for example `http://example.com`),
never the full address.

## What the extension sends

Nothing. There is no analytics, tracking, account or third-party service.

## Contact

Questions about this policy can be asked through the
[issues of the repository](https://github.com/carlosalbertoxw/HTTPSVerifier/issues).
