# Flow Outliner: project instructions

Obsidian community plugin. Goal: one stable, tested plugin that combines the outliner and zoom behavior of `vslinko/obsidian-outliner` and `vslinko/obsidian-zoom`, then goes further toward RemNote, Roam Research and Logseq. It must work on the latest Obsidian release and never break. See `docs/reference-plugins.md`.

- Target: Obsidian Community Plugin (TypeScript → bundled JavaScript).
- Entry point: `src/main.ts` compiled to `main.js` and loaded by Obsidian.
- Required release artifacts: `main.js`, `manifest.json`, and optional `styles.css`.

Project rules live in `.claude/rules/`, one file per topic: working mode, code style, tech stack, commands, architecture, project structure, Obsidian best practices, plugin patterns, manifest and releases, security and privacy, UX, performance and mobile, testing, agent tooling.
