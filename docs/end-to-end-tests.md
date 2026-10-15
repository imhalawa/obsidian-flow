# End-to-end tests

The end-to-end tests run the built plugin in real Obsidian on Linux and drive it over the Chrome DevTools protocol. They catch what unit tests cannot: Obsidian changing an API the plugin relies on.

Run them with `npm run test:e2e`. They are not part of `npm run check`.

## Prerequisites

- `curl`, `squashfs-tools` (for `unsquashfs`) and `xvfb`. Install them with `apt-get install -y curl squashfs-tools xvfb`.
- Network access to the Snap store (`api.snapcraft.io`). github.com release downloads are not needed.

## How it works

1. `ensureObsidian` downloads the current Obsidian build from the Snap store on first use, checks its sha3-384 hash and unpacks it into `.e2e-cache/` (set `FLOW_E2E_CACHE` to use another folder).
2. `ObsidianApp.start` creates a throwaway vault with the built `main.js`, `manifest.json` and `styles.css`, starts a virtual display (Xvfb on `:99`) and Obsidian with `--remote-debugging-port=9222`, then enables community plugins and the plugin.
3. `NoteEditor` opens a note, places the cursor, runs plugin commands and reads the text, selections and notices back.
4. `ObsidianApp.stop` kills Obsidian and the display and removes the vault.

Tests live in `e2e/*.e2e.ts` and run one file at a time because they share the debugging port and display.

## Writing a test

Open a note with `NoteEditor.open`, call `caret`, `select` or `runCommand`, then assert on `text()` and `selections()`. Use `lezerShape` from `tests/support` to check that the result still parses as the intended list.

## Notes

- Tests change editor settings through `app.vault.setConfig`, an internal API, and restore them afterwards. The plugin itself never uses it.
- Only Linux is covered.
