# Manifest and releases

## Manifest (`manifest.json`)

- Must include (non-exhaustive): `id` (for local dev it should match the folder name), `name`, `version` (Semantic Versioning `x.y.z`), `minAppVersion`, `description`, `isDesktopOnly` (boolean).
- Optional: `author`, `authorUrl`, `fundingUrl` (string or map).
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements are coded here: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Versioning and releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version to minimum app version.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version`. Do not use a leading `v`.
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets.
- After the initial release, follow the process to add or update the plugin in the community catalog as required.

## Manual install for testing

- Copy `main.js`, `manifest.json`, `styles.css` (if any) to `<Vault>/.obsidian/plugins/<plugin-id>/`.
- Reload Obsidian and enable the plugin in **Settings → Community plugins**.
