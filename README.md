# Flow Outliner

Edit lists as an outline in Obsidian: zoom into an item, fold branches, move items with the keyboard or by dragging, and link to a single bullet. It follows the outliner experience of RemNote, Roam Research and Logseq and works on plain Markdown. Zoom and folds are view state, so your notes only ever contain text you would write yourself.

Needs Obsidian 1.12.0 or newer. It is built for desktop and mobile, but only desktop (Linux) is tested; touch behavior has not been tried on a phone.

## Features

- **Move and indent.** Indent, outdent, and move an item up or down together with its children. Ordered lists keep their numbering and every change is checked against a re-parse before it is written.
- **Zoom.** Zoom into a list item or a heading (right-click it and choose **Zoom in**, or run the command) and see only it and what is under it. The path back up (`Inbox / Test > Some Idea > Bullet 2`) is drawn in the note header, and the zoomed item moves to the left edge without the guides of the levels above it. The mouse back and forward buttons step through zoom levels first. Zoom is remembered per note. See [docs/zoom.md](docs/zoom.md) and [docs/mouse-history.md](docs/mouse-history.md).
- **Folds.** Fold and unfold an item or the whole note. Folds survive zooming. See [docs/folds.md](docs/folds.md).
- **Bullets and thread lines.** Select a bullet to zoom, select a thread line to fold its branch (hold Alt to fold every descendant). See [docs/bullets-and-thread-lines.md](docs/bullets-and-thread-lines.md).
- **Block links.** Copy a link to an item, and type `((` to search items in your vault. The `^id` is written only when you ask for a link, and can be hidden away from the cursor line. See [docs/block-references.md](docs/block-references.md).
- **List editing.** Enter on an empty item outdents it, Backspace at the start of an item merges it into the one above, Home and select all stay inside the item text, and optional Tab and Shift-Tab move whole items. See [docs/list-editing.md](docs/list-editing.md).
- **Drag and drop.** Drag an item by its bullet, also into another open note. See [docs/drag-and-drop.md](docs/drag-and-drop.md).

## Commands

The plugin sets no default hotkeys. Every action is a command that you can bind in **Settings → Hotkeys**. Commands appear only where they apply.

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| Indent item         | Indents the item with its children                        |
| Outdent item        | Outdents the item with its children                       |
| Move item up        | Swaps the item with the sibling above                     |
| Move item down      | Swaps the item with the sibling below                     |
| Zoom in             | Shows only the item at the cursor and its children        |
| Zoom out            | Goes up one level                                         |
| Show the whole note | Leaves the zoom                                           |
| Zoom back           | Steps back through the zoom levels you visited            |
| Zoom forward        | Steps forward through the zoom levels you visited         |
| Fold item           | Folds the item at the cursor                              |
| Unfold item         | Unfolds the item at the cursor                            |
| Fold all items      | Folds every item that has children                        |
| Unfold all items    | Unfolds every item                                        |
| Copy link to item   | Adds a block id to the item if needed and copies the link |

## Settings

Under **Settings → Flow Outliner**. Every behavior can be switched off.

| Setting                                     | Default |
| ------------------------------------------- | ------- |
| Remember zoom per note                      | On      |
| Show the zoomed item at the left edge       | On      |
| Hide block ids                              | On      |
| Suggest items after `((`                    | On      |
| Click bullet to zoom                        | On      |
| Click thread line to fold                   | On      |
| Use mouse back and forward for zoom         | On      |
| Drag items by their bullet                  | On      |
| Enter on an empty item outdents it          | On      |
| Backspace at the start of an item merges it | On      |
| Home stays inside the item text             | On      |
| Select all starts with the item text        | On      |
| Tab and Shift-Tab move whole items          | Off     |

## Limits

- The path in the note header is drawn into Obsidian's own header, which has no public API. If a future Obsidian version changes the header, the path is not drawn and the plugin shows a notice once; zooming itself keeps working.
- While you drag, the editor does not scroll. Folds of a subtree dragged into another note are not carried along.
- When the zoomed item disappears, for example after an edit in another pane or by sync, the whole note is shown with the message "Zoomed item was removed. Showing the full note."
- Zoom is stored in the local storage of the vault on the device, not in the note, so it does not sync.

Each page in [docs](docs) lists the limits of its feature.

## Privacy

The plugin makes no network requests, collects nothing and reads and writes only notes in your vault.

## Install

To try a beta, add `imhalawa/obsidian-flow` in the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin with **Add beta plugin**. Otherwise, until the plugin is in the community list, download `main.js`, `manifest.json` and `styles.css` from a release and copy them to `<Vault>/.obsidian/plugins/flow-outliner/`. Then enable it in **Settings → Community plugins**.

## Development

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
npm run check
```

| Script                  | Purpose                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev`           | Watch build to `main.js`                                                                  |
| `npm run build`         | Typecheck and production bundle                                                           |
| `npm run check`         | Typecheck, lint, format check, tests with coverage                                        |
| `npm run test:mutation` | Mutation testing with Stryker                                                             |
| `npm run test:e2e`      | Tests in real Obsidian on Linux, see [docs/end-to-end-tests.md](docs/end-to-end-tests.md) |
| `npm run format`        | Format with Prettier                                                                      |

Contributor and agent guidance: [CLAUDE.md](CLAUDE.md), [docs/references.md](docs/references.md). The two plugins this one is modelled on are listed in [docs/reference-plugins.md](docs/reference-plugins.md).

## Releasing

See [docs/releasing.md](docs/releasing.md).

## License

See [LICENSE](LICENSE).
