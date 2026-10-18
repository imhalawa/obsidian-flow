# Can Roamer go further without changing clean Markdown?

Date: 2026-10-15. Method: desk research on public sources (READMEs, source code, GitHub issues). Plugins covered: vslinko/obsidian-outliner, vslinko/obsidian-zoom, and Logseqer.

## Decision

**Yes, for most of the experience.** Everything Outliner and Zoom do today is either an editor-only view effect or an edit to plain list text. Most of what makes Roam, RemNote and Logseq feel different (zoom into a bullet, breadcrumbs, persistent folds, linked references, bullet-as-node navigation, hiding noise) can also be built without adding markup to the note, if the state lives outside the note.

**Exactly one feature really needs markup:** stable block references and embeds. A block has no identity in Markdown, so a reference to it needs an anchor. Obsidian already has a native one, the `^id` suffix. Rule: write `^id` only on a block the user actually references, never on every bullet.

**Do not adopt Logseq's file format.** Logseq's `id:: uuid`, `collapsed:: true` and `key:: value` lines are the part that makes a note "Logseq-only". Read them if present, never write them.

## Where each kind of state can live

| Feature                                      | Needs markup? | Where state lives instead                                 | Notes                                                                                                                                                                 |
| -------------------------------------------- | ------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zoom into a bullet or heading                | No            | Editor state, saved per file in plugin data or view state | Zoom today keeps it only in CodeMirror state and loses it on history navigation or restart (zoom issue 115).                                                          |
| Breadcrumbs, parent zoom                     | No            | Derived from the document tree                            | Zoom issue 123 asks for zoom to parent.                                                                                                                               |
| Fold and collapse                            | No            | Obsidian's own fold state, or plugin data keyed by file   | Logseq writes `collapsed:: true`. We must not. Risk: positions drift when another editor changes the file, so key folds by a content anchor, not a line number alone. |
| Hide `^id`, HTML, YAML while zoomed          | No            | Editor decorations                                        | Requested in zoom issues 119 and 110.                                                                                                                                 |
| Move items, move headings, move across notes | No            | Plain text edits                                          | Outliner issues 561, 564, 571.                                                                                                                                        |
| Backlinks and linked references              | No            | In-memory index rebuilt from the vault                    | Never stored in the note.                                                                                                                                             |
| Block reference or embed                     | Yes, `^id`    | The `^id` suffix, written lazily                          | Obsidian-native, so it stays valid without our plugin.                                                                                                                |
| Per-block properties (`key:: value`)         | Yes           | Avoid. Use note frontmatter where a property is per note  | Inline fields are a Dataview convention, not Markdown.                                                                                                                |
| Every line is a bullet (Logseq rule)         | Yes           | Do not require it                                         | Detect list-only notes by content. A per-note opt-in flag would be markup, so keep it optional.                                                                       |

Hard limit: without ids, there is no stable block identity across edits. Anything keyed to a position or a hash of content (fold, zoom restore) is a best effort and needs a safe fallback of "show everything".

## What the three plugins do to the note

**obsidian-outliner** (4.10.2, last commit 2026-06-27, about 1.4k stars, 97 open issues)

- Folding dispatches CodeMirror fold effects and writes nothing to the note.
- Moves, indents and outdents rewrite list text: `ChangesApplicator.apply()` calls `replaceRange` on the changed span only, and re-folds by line number afterwards.
- Writes no frontmatter or metadata in the code read.
- Relies on undocumented parts: the CodeMirror view cast from the editor, hidden `vault.config` keys (`foldIndent`, `useTab`, `cssTheme`), and the `window.ObsidianZoomPlugin` global. Styles only work with the built-in theme. `minAppVersion` is 1.11.7.

**obsidian-zoom** (1.1.2, last code change 2023-05-04, 274 stars, 13 open issues)

- Hides everything outside the zoomed range with block-replace decorations. No note writes in any file read.
- Zoom state is lost on history navigation, workspace switch and restart (issue 115).
- Needs Obsidian's **Fold heading** and **Fold indent** editor settings on.
- No maintainer replies seen on 2025 issues. Treat it as unmaintained, but MIT licensed.

**Logseqer** (Sisyphe42/obsidian-logseqer-plugin, MIT, 69 stars, no releases listed)

- This is the plugin the request called "logseqer". It is Logseq compatibility tooling, not an outliner.
- Works on plain `.md` files. It warns about lines that do not start with `- ` and forces `- ` onto new journal files only.
- Offers a vault check (date formats, folders, `___` namespaces in file names, task markers), bookmark sync with Logseq favorites, and empty-journal cleanup (off by default).
- No handling of `id::`, `collapsed::` or `^id` was seen. The tail of `main.ts` was not fully read.
- Neighbours: ruivieira/obsidian-plugin-logseq only restyles Logseq markup in preview and writes nothing. Block Reference Enhancer renders Logseq `((uuid))` references and says it hides `id::` and `collapsed::` lines. Block Link Plus uses Obsidian `^id` anchors with hidden metadata (from search snippets only, not verified).

## What users complain about

Themes from public issues, with counts of what was read.

| Theme                                       | Evidence                                                                                                                                                                        | Implication for Roamer                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Drag and drop breaks after Obsidian updates | Outliner 444, 489, 506, 598 (Obsidian 1.12.7, 2026-06), 588 (pop-out windows)                                                                                                   | Highest regression risk. Test it, or ship it later.                           |
| Fold state is lost or changes unexpectedly  | Zoom 92 (zoom out unfolds everything), Outliner 549 and 550 (folded block, vim), 258 (conflict with Obsidian's fold memory), 186                                                | Own fold state explicitly. Persist it and test the round trip.                |
| Zoom is not remembered                      | Zoom 115, 82                                                                                                                                                                    | Persist zoom per file. Easy win with no markup.                               |
| Zoomed view looks wrong                     | Zoom 124 (indent stays), 122 (header styling), 119 (block ID and HTML visible), 65                                                                                              | Pure view work.                                                               |
| Indentation breaks text                     | Outliner 591 (mixed tabs and spaces), 585 (after changing indent settings), 593 (tables)                                                                                        | "Clean Markdown" also means never corrupting indentation. Needs strong tests. |
| Split view or second pane damage            | Zoom 94 (content erased when the same note is open twice)                                                                                                                       | Treat as a data-loss bug class.                                               |
| Crashes in rarely hit paths                 | Outliner 600, 601                                                                                                                                                               | Guard every editor API call.                                                  |
| Wanted outliner features                    | Move headings (561), move paragraphs (564), move across notes (571), hide empty bullets (576), zoom to parent (123), tab title from zoomed header (114), right-click zoom (117) | Roadmap candidates, all markup-free.                                          |

## Jobs to be done

1. When I write in nested lists, let me restructure fast without breaking my file.
2. When I work deep in one thought, let me focus on that branch and come back to the same place later.
3. When I link ideas, let me refer to a single bullet and see where it is used.
4. When I leave Obsidian or share the vault, keep my notes readable everywhere.

Jobs 1, 2 and 4 need no markup. Only job 3 does, and only `^id`.

## Priorities (impact against effort)

| Item                                   | Impact | Effort        | Markup           |
| -------------------------------------- | ------ | ------------- | ---------------- |
| Persist zoom and fold per file         | High   | Low to medium | None             |
| Hide `^id` and noise while zoomed      | Medium | Low           | None             |
| Safe indentation handling with tests   | High   | Medium        | None             |
| Move headings and cross-note moves     | Medium | Medium        | None             |
| Lazy `^id` block references and embeds | High   | High          | `^id` only       |
| Reading Logseq `id::` and `((uuid))`   | Low    | Medium        | None (read-only) |

## Risks to plan for

- Outliner leans on undocumented editor internals, so a new Obsidian release can break it. Roamer should isolate those calls in one adapter module with tests.
- Sidecar state can go stale after sync or external edits. Always fall back to showing the full note.
- Zoom's design is simple. Porting its idea is cheap, but its fold-setting dependency is a known pain.
- Both source plugins are MIT. See `docs/reference-plugins.md` in the repo for the attribution rule.

## Limits of this research

- This is secondary desk research. It shows what people report publicly, not how often or how badly. Obsidian forum and Reddit could not be reached (DNS failure and blocked), so those voices are missing.
- Most issue bodies were not opened. Counts come from list pages, titles and the issues quoted above.
- The Logseqer identification matches the name exactly, but its download count and the end of `main.ts` were not verified. Block Link Plus was not fetched.
- Obsidian's fold-state storage location was not confirmed. Check it before building persistence.

## Suggested next step

Validate with 5 to 8 interviews of Obsidian outliner users (current Outliner or Zoom users, plus people who left for Logseq):

- Warm-up and current workflow: what lists look like, how deep, how long.
- Deep dive: when do you fold, zoom, reference a block, and what do you lose when it resets?
- Reaction: show a mock of lazy `^id` references and a persisted zoom, and ask what feels risky for their notes.
- Wrap-up: what would make you trust a plugin with your vault?

## Sources

- https://github.com/vslinko/obsidian-outliner (README, `src/`, issues, releases)
- https://github.com/vslinko/obsidian-zoom (README, `src/`, issues, releases)
- https://github.com/Sisyphe42/obsidian-logseqer-plugin
- https://github.com/ruivieira/obsidian-plugin-logseq
- Block Reference Enhancer and Block Link Plus listings on community.obsidian.md (search snippets)
