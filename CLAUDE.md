@AGENTS.md

# Flow Outliner: project instructions

Obsidian community plugin. Goal: one stable, tested plugin that combines the outliner and zoom behavior of `vslinko/obsidian-outliner` and `vslinko/obsidian-zoom`, then goes further toward RemNote, Roam Research and Logseq. It must work on the latest Obsidian release and never break. See `docs/reference-plugins.md`.

## Working mode

- Caveman `ultracave` is on for every thread, subagent and tool session (`.caveman.json`). Terse chat only.
- Commits, PR text, docs, code and tests are written in normal clear English, never caveman.
- Every commit follows Conventional Commits: `type(scope): subject`, imperative, lowercase, no trailing period. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Breaking changes use `!` or a `BREAKING CHANGE:` footer. One logical change per commit. PR titles follow the same format. `commitlint` enforces it locally (husky `commit-msg` hook) and in CI.
- PR descriptions are short: a few lines on what changed, plus screenshots for UI changes. No "written by Claude" ending, no session URLs. The repo will be public.
- Commits carry no Claude attribution: no `Co-Authored-By`, no session links (`includeCoAuthoredBy: false`).
- Use superpowers: brainstorm, write a plan, red/green TDD, review, for every feature and bug fix.
- Use ponytail: smallest working change. Do not skip validation, error handling, accessibility or tests.

## Hard rules

- Clear, readable code. Explicit over implicit: no default parameter values, no implicit conversions, no hidden coupling, no `any`.
- No comments in code. Function doc comments only, one brief definitive sentence (`/** Returns the nesting depth of an indent. */`).
- Tests stay readable: one behavior per test, names that state the behavior, `it.each` tables for input and output cases, no logic in tests.
- Never break the plugin: `npm run check` and `npm run build` pass before every push. CI enforces the same.
- Test quality is the mutation score, not coverage alone. A surviving mutant means a missing test.

## Tech stack

- TypeScript with `strict`, `noUncheckedIndexedAccess`. Bundled by esbuild to `main.js`. Entry `src/main.ts`.
- Editor behavior is built as CodeMirror 6 extensions (`@codemirror/*` and `@lezer/*` come from Obsidian, never bundle them).
- Vitest for tests, `tests/mocks/obsidian.ts` stands in for the types-only `obsidian` package.
- ESLint (`eslint-plugin-obsidianmd`, `@vitest/eslint-plugin`), Prettier, Stryker mutation testing.
- npm only. Node 22.12 or newer. Vitest stays on `~4.0` until npm and Stryker support newer versions.

## Commands

- `npm run check`: typecheck, lint, format check, tests with coverage. Run before every commit.
- `npm run test`, `npm run test:watch`: unit tests.
- `npm run test:mutation`: Stryker. Score must stay at or above `thresholds.break` in `stryker.config.json`.
- `npm run build`: typecheck and production bundle. `npm run dev`: watch build.
- `npm run format`: Prettier write.
- `npm run commitlint -- --from <ref>`: check commit messages since a ref.

## Architecture

- `src/main.ts`: lifecycle only. Load settings, register commands, editor extensions and the settings tab.
- `src/settings.ts`: settings interface, defaults, settings tab.
- `src/outline/`: pure logic on text and plain data (list parsing, tree operations, move, indent, fold, zoom ranges). No `obsidian` or `@codemirror` imports. Fully unit tested.
- `src/editor/`: CodeMirror 6 adapters that turn editor state into pure inputs and apply pure results as transactions.
- `src/commands/`: one file per command, registered from one index.
- `src/ui/`: modals and views.
- Files stay under about 200 lines and have one responsibility.
- Pure modules take explicit inputs and return new values. Side effects live only in adapters.

## Obsidian plugin best practices

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

## Testing rules

- Test pure modules directly with plain data. Keep adapters thin so they need few tests.
- Write the failing test first. Cover empty, single, nested and malformed inputs, and boundary values.
- Mock only the `obsidian` module boundary, in `tests/mocks/obsidian.ts`. Keep each stub minimal.
- Do not weaken a test to pass a mutant. Add the missing case.
- Never skip, disable or focus tests. Lint rejects it.

## Agent tooling

Configured in `.claude/settings.json`. Claude Code asks to trust the marketplaces on first run.

- superpowers (`obra/superpowers`), caveman (`JuliusBrussee/caveman`), ponytail (`DietrichGebert/ponytail`), obsidian-skills (`kepano/obsidian-skills`).
- References: `docs/references.md`. Reference plugins and attribution: `docs/reference-plugins.md`.
