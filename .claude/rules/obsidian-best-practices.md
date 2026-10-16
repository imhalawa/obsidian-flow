# Obsidian plugin best practices

Follow the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines), [developer policies](https://docs.obsidian.md/Developer+policies) and [submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins). Key points:

- Register every listener, interval, command and editor extension through `this.register*`, `this.addCommand`, `this.registerEditorExtension`. Unload must leave nothing behind. Never detach leaves in `onunload`.
- Use `this.app`, never the global `app`. Use `activeWindow` and `activeDocument` for popout windows.
- Command IDs are stable and unprefixed (Obsidian adds the plugin id). Ship no default hotkeys, so users never get conflicts. Use `editorCheckCallback` or `checkCallback` so commands show only when valid.
- Edit the open note through the `Editor` API or a CodeMirror transaction. Edit closed files with `Vault.process`. Edit frontmatter with `FileManager.processFrontMatter`. Do not use `Vault.modify` on the active file.
- Use `Vault.getFileByPath` and `getFolderByPath` instead of scanning all files. Wrap user paths in `normalizePath`.
- Build DOM with `createEl`, `createDiv`, `setText`. Never `innerHTML` or `outerHTML`.
- Style with CSS classes and Obsidian CSS variables in `styles.css`. No inline styles. Work in light and dark themes and with custom themes.
- Use `Platform` for platform checks and `requestUrl` for network. Make no network calls without a documented user-facing reason. Collect no telemetry.
- Mobile is first class: no Node or Electron APIs unless `isDesktopOnly` is `true`. Check touch behavior and virtual keyboards.
- Settings: sensible defaults, validation, sentence case, headings through `new Setting(el).setName(...).setHeading()`. Persist with `loadData` and `saveData`.
- Do not rely on undocumented or internal APIs. When unavoidable, isolate behind one adapter with a feature check and a test, so an Obsidian update cannot break the rest.
- Keep startup light. Defer heavy work. Debounce expensive reactions to editor and vault events.
- Manifest: `id` has no "obsidian" and never changes after release. `name` has no "Obsidian". `description` is under 250 characters, starts with an action, ends with a period, no emoji. Keep `minAppVersion` accurate and `versions.json` in sync.
- Release: tag equals `manifest.json` version with no leading `v`. Attach `main.js`, `manifest.json`, `styles.css`. Repo has `README.md` and `LICENSE`.
- Compatibility with the latest Obsidian is verified by end-to-end tests in real Obsidian (`wdio-obsidian-service`) once the first editor feature lands. Add them with that feature.
