# Security policy

## Supported versions

Only the latest version published on the
[Chrome Web Store](https://chrome.google.com/webstore/detail/https-verifier/ogfgecooebcghjojlklphjjajaegcpen)
receives fixes. Chrome updates installed extensions automatically.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them
privately through GitHub:
[Report a vulnerability](https://github.com/carlosalbertoxw/HTTPSVerifier/security/advisories/new).

Include the affected version, the steps to reproduce it and the impact you
expect. You will get an answer as soon as possible. This is a personal project
maintained in spare time, so please allow a few days.

## Scope

In scope: the extension code in this repository and its packaged releases.
Examples: a page being able to run code in the extension context, data leaving
the browser, or a permission used beyond what the README and the
[privacy policy](https://carlosalbertoxw.com/HTTPSVerifier/PRIVACY.html)
describe.

Out of scope: false positives or false negatives of the HTTPS checks. Report
those as regular issues.

## Threat model

What is worth protecting is not data: the extension stores none and sends
nothing. It is the **access**: the extension can read every site its users
visit, and Chrome installs its updates automatically. Whoever can publish a
version controls that access for every user. Review this section when the
permissions, the release process or the code that runs in pages change.

| Threat | Entry point | Mitigation |
|--------|-------------|------------|
| Someone takes over the maintainer's accounts and publishes a malicious version. | The Google account that owns the Chrome Web Store item; the GitHub account. | Two-step verification on both accounts, with a passkey or security key rather than SMS; the upload to the store is manual and there are no store credentials in CI (see the README); incident response below. |
| A malicious version is built from tampered files. | A compromised npm dev dependency (ESLint, Prettier, Puppeteer and their dependencies) or GitHub Action. | The published ZIP is built in a CI job that installs no npm packages; actions are pinned by commit SHA; Dependabot waits 7 days before proposing a new version; the ZIP carries a build provenance attestation that is verified before uploading it. |
| A change to `master` or to a release tag that skips the checks. | Pushing directly or rewriting history. | Rulesets: CI must pass on `master`, which cannot be force-pushed or deleted; `v*` tags cannot be moved or deleted. |
| A web page attacks the extension through the data it returns. | The URLs and counts that the injected function sends back to the service worker or the popup. | The function runs in an isolated world, so the page cannot change the functions it uses; its results are parsed as URLs and only counted; the popup and the notifications use plain text, never HTML. The extension exposes no messaging endpoint (`onMessage`, `externally_connectable`) or web-accessible resources. |
| A web page makes the check slow on purpose. | A page with a huge number of addresses. | At most 5,000 addresses of each kind are collected per frame, and addresses that cannot be insecure are discarded inside the page. |
| The extension leaks what the user browses. | Notifications, logs, storage. | Notifications and logs show only the origin; the last notified URL per tab lives in `chrome.storage.session` (memory only) and is deleted when the tab closes; no network requests. |
| A new permission or a broader use of the existing ones. | A change to `manifest.json`. | A unit test fails when the permissions change; CONTRIBUTING asks for a discussion first. |

## Incident response (maintainer)

The extension can read every site its users visit and Chrome installs updates
automatically, so a malicious or broken version reaches every user within
hours. If a published version is malicious or broken, or if the Chrome Web
Store, Google or GitHub account may be compromised:

1. **Stop the spread.** In the
   [Developer Dashboard](https://chrome.google.com/webstore/devconsole),
   unpublish the item (or roll back to the previous version, if the dashboard
   offers it).
2. **Lock the accounts.** Sign out every session of the Google and GitHub
   accounts, change their passwords, and review their passkeys, security keys,
   recovery options, OAuth apps and GitHub personal access tokens. Check the
   repository for unexpected collaborators, deploy keys, rulesets, workflow
   changes and tags.
3. **Ask for help.** Contact Chrome Web Store developer support and, if
   GitHub was affected, GitHub Support.
4. **Publish a clean version** from a tag you have checked: let CI attach the
   ZIP to the GitHub release, verify it with
   `gh attestation verify <zip> --repo carlosalbertoxw/HTTPSVerifier`, and
   upload that ZIP with a version number higher than the bad one.
5. **Tell the users.** Publish a GitHub security advisory and a note at the top
   of the README: affected versions, what the bad version could do, and what
   users should do (usually nothing beyond updating).
