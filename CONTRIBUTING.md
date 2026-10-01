# Contributing

Thanks for your interest in HTTPS Verifier.

## Before you start

- For bugs and ideas, open an issue first. For changes to what gets notified or
  to the permissions the extension asks for, wait for a short discussion before
  writing the code.
- Report security problems privately, as described in [SECURITY.md](SECURITY.md).

## Development

Requirements: Node.js 20.19, 22.13 or 24+, and Chrome 102 or later.

```
npm ci
npm run lint
npm run format  # Prettier; CI runs npm run format:check
npm test
npm run build   # creates dist/https-verifier-<version>.zip
```

To try the extension, load the project folder from `chrome://extensions` with
**Developer mode** and **Load unpacked**.

## What a change needs

- `npm run lint`, `npm run format:check` and `npm test` pass (CI runs them on
  every pull request).
- Permissions in `manifest.json` do not change without a discussion first: any
  new permission disables the extension for existing users until they accept
  it (see "Permissions" in the README).
- New logic comes with unit tests. Keep the logic in pure modules
  (`insecure-url.js`, `issues.js`) so it can be tested without Chrome.
- New user-facing texts are added to **all** locales in `_locales/`. A test
  fails if a key or placeholder is missing.
- A new file the extension needs at runtime is added to `PACKAGE_ENTRIES` in
  `scripts/build.mjs`. The build fails if a packaged file references one that
  is not packaged.
- User-visible changes are listed under `Unreleased` in
  [CHANGELOG.md](CHANGELOG.md).
- No network requests, analytics or remote code: see [PRIVACY.md](PRIVACY.md).

## Commits and branches

- Work on a branch and open a pull request against `master`.
- One topic per commit, written in English, using
  [Conventional Commits](https://www.conventionalcommits.org/):
  `feat: detect insecure form actions`, `fix: ...`, `docs: ...`, `chore: ...`.

## Releasing (maintainer)

1. Move the `Unreleased` entries in `CHANGELOG.md` to the new version.
2. Bump `version` in **both** `manifest.json` and `package.json`.
3. Commit, then tag and push: `git tag v1.4.0 && git push origin master v1.4.0`.
4. CI checks that the tag matches the manifest and attaches the ZIP to a GitHub
   release. Upload that ZIP to the Chrome Web Store (see the README).
