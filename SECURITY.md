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
the browser, or a permission used beyond what the README and
[PRIVACY.md](PRIVACY.md) describe.

Out of scope: false positives or false negatives of the HTTPS checks. Report
those as regular issues.

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
