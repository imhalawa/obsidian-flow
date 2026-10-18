# Obsidian internals Roamer depends on

Roamer is built on public APIs and CodeMirror 6 extensions wherever possible. Some features need things Obsidian does not document. Each one is listed here, marked in code with a `TODO(obsidian-update)` comment, and guarded by a test. After every Obsidian update, run the end-to-end suite (`e2e/`) first: `e2e/obsidian-contract.e2e.ts` fails with the name of the missing piece.

Find every marker with:

```bash
grep -rn "TODO(obsidian-update)" src styles.css
```

## 1. `editor.cm` (the CodeMirror view behind an `Editor`)

- **What:** Obsidian's `Editor` has no public way to reach its CodeMirror `EditorView`. Roamer reads `editor.cm` through a cast and uses its `state` and `dispatch`.
- **Why:** Every command and zoom runs on editor state and transactions, so they all depend on it.
- **Files:** `src/editor/zoom-control.ts` (`zoomTargetOf`), `src/editor/editor-indent-style.ts`.
- **How it breaks:** Obsidian renames or removes `cm`, or wraps it. `zoomTargetOf` returns `null`, so commands do nothing and no zoom works. Indent settings fall back to tabs.
- **Isolation:** `zoomTargetOf` is the single entry point for commands and zoom. It checks the shape (`dispatch`, `state`, zoom field) at runtime and returns `null` instead of throwing. The indent reader does the same.
- **Guards:** `tests/editor/zoom-control.test.ts`, `tests/editor/editor-indent-style.test.ts`; `e2e/obsidian-contract.e2e.ts` ("CodeMirror view behind the editor").

## 2. Obsidian DOM selectors

- **What is used:**
    - `.cm-fold-indicator`: Obsidian's fold arrow, used to ignore clicks on it, to light the bullet and to find its center (`src/editor/fold-indicator.ts`, `styles.css`).
    - `.cm-formatting-list`: the rendered list marker, measured by clean zoom (`src/editor/clean-zoom.ts`).
    - `.list-bullet`, `.callout-title` and the callout markup: measured to place callout bullets (`src/editor/callout-widget.ts`).
- **Why:** The fold arrow and list marker are drawn by Obsidian, not by Roamer. obsidian-zoom and obsidian-outliner rely on the same classes.
- **How it breaks:** A renamed or restructured class makes bullets, the fold arrow and drag start misbehave.
- **Isolation:** Each selector is a single constant in one file. Missing elements return `null` and the feature turns itself off instead of throwing.
- **Guards:** `tests/editor/fold-indicator.test.ts`; `e2e/obsidian-contract.e2e.ts` ("Obsidian DOM the plugin attaches to"), `e2e/folds.e2e.ts`.

### The zoom path is not an Obsidian DOM dependency

The path used to be injected into the note header (`.view-header-title-container`, `.view-header-title`), which has no API. It is now a CodeMirror panel (`showPanel`, public API), so Roamer no longer touches the header. The title click was replaced by a first crumb with the note name. Guards: `tests/editor/zoom-panel.test.ts`, `tests/ui/panel-crumbs.test.ts`, `e2e/header-breadcrumbs.e2e.ts`.

### Research

- Header classes are not in `obsidian.d.ts`, and the header was reworked in Obsidian 0.16, so churn has happened before. The panel approach is what obsidian-zoom uses.
- `.cm-fold-indicator` and `.cm-formatting-list` are used by obsidian-zoom and obsidian-outliner. Class history for Obsidian 1.5 to 1.14 was not verified.

## 3. `window.history` wrapping (mouse back and forward)

- **What:** The mouse back and forward buttons call `history.back()` and `history.forward()` in the window. Roamer replaces both with a wrapper that first steps through the zoom history and calls the original when there is nothing to step.
- **Why:** There is no public hook for those buttons.
- **Files:** `src/editor/history-wrapper.ts`, `src/editor/register-mouse-history.ts`.
- **How it breaks:** Obsidian or Electron stops routing the buttons through `window.history`. Mouse buttons then only navigate notes, as without Roamer. Another plugin that wraps the same methods can also conflict.
- **Isolation:** The wrapper checks the methods exist, is installed per window (including popouts), is restored on unload only if it is still the current function, and is off when the setting is off.
- **Guards:** `tests/editor/history-wrapper.test.ts`; `e2e/obsidian-contract.e2e.ts` ("history the plugin wraps"), `e2e/mouse-history.e2e.ts`.

## 4. Clean zoom (zoomed item at the left edge)

- **How it works:** A zoomed item keeps its original indent in the document. To show it at the left edge, Roamer marks the zoomed lines with line decorations, marks the indent characters that belong to the hidden levels, measures how far the list marker sits from the left of the line (`.cm-formatting-list`), and publishes that as the CSS variable `--roamer-zoom-shift`. `styles.css` then moves the lines left (`inset-inline-start`) and hides the marked indent (`visibility: hidden`, also on the `.cm-indent` span that wraps it, found with `:has()`), so no guide line or selection paint is left over. Because the lines really move, CodeMirror measures the caret and selection at the right place, so those layers are left alone.
- **Why it is a hack:** CodeMirror and Obsidian have no concept of a view that starts at a deeper indent. The plugin changes geometry in CSS over lines and indent spans it does not own (`.cm-line`, `.cm-indent`), so a change to how Obsidian lays out the editor can misplace the text or leave an indent guide visible.
- **Files:** `src/editor/clean-zoom.ts`, `src/editor/clean-zoom-decorations.ts`, `styles.css` (`.roamer-zoom-line`, `.roamer-zoom-hidden-indent`).
- **How it breaks:** The cursor or selection is offset from the text, indent guides show, or the item stays indented. It never changes the note.
- **Isolation:** It is a setting (clean zoom), can be switched off, and only adds decorations and CSS. If the marker cannot be measured, no shift is applied.
- **Guards:** `tests/editor/clean-zoom-decorations.test.ts`; `e2e/clean-zoom.e2e.ts`.

### Research

- A translate on `.cm-cursorLayer` and `.cm-selectionLayer` was removed: it double-shifted the caret (about 100 px to the left of the text while zoomed). `e2e/clean-zoom.e2e.ts` guards it.
- Hiding the indent steps with `Decoration.replace` plus `atomicRanges` instead of moving lines was analysed and not adopted. Verified in Obsidian 1.14: every list line carries an inline hanging indent set by Obsidian in pixels (for example `text-indent: -94px; padding-inline-start: 94px`). Removing indent steps would pull the first line left but leave wrapped lines the width of the removed steps too far right, and only overriding Obsidian's own inline pixels could fix that. Moving the whole line keeps both in step, so it stays, now without the layer translate and without the clip, which marked, hidden indent steps replace.
- Controlling `--list-indent` (see section 6) means the indent width is the same everywhere, but the shift is still measured because notes can indent by tabs or by any number of spaces.

## 5. Callout bullets are a plugin-only rendering

- **What:** A list item like `- > [!tip] Title` is shown by Roamer as a bullet followed by a rendered callout. Obsidian itself shows the raw text for this form.
- **This is intentional.** It is a deliberate behavior change that is part of the journaling experience, not a defect. The note stays plain Markdown; with Roamer off, Obsidian shows the raw text.
- **Files:** `src/editor/callout-decorations.ts`, `src/editor/callout-widget.ts`, `styles.css`. The widget renders with `MarkdownRenderer` and measures `.list-bullet` and `.callout-title`.
- **How it breaks:** Renamed callout classes or a changed callout structure misplace the bullet or guide. Content is never altered.
- **Guards:** `tests/editor/callout-bullets.test.ts`, `tests/editor/callout-decorations.test.ts`; `e2e/callout-bullets.e2e.ts`, `e2e/obsidian-contract.e2e.ts` ("callout markup the plugin lays out").

## 6. Indent spacing (`--list-indent`)

- **What:** With the setting on, Roamer adds a class to every editor (`EditorView.editorAttributes`) and `styles.css` sets `--list-indent: 2.25em` on it, the width of Obsidian's default.
- **Why:** Themes change `--list-indent`, which moves guide lines, bullets and fold arrows apart unevenly. Verified in Obsidian 1.14: when the variable changes, Obsidian lays out the indent steps, the hanging indent (`padding-inline-start`, `text-indent`), the bullet and the fold arrow together, and the bullet stays a fixed 12 px right of the fold arrow.
- **How it breaks:** Obsidian stops reading `--list-indent`, or a theme sets it on an element below `.cm-editor`. Indents then follow the theme, which is the same as the setting being off.
- **Guards:** `tests/editor/indent-spacing.test.ts`, `e2e/indent-spacing.e2e.ts` (a theme override must not win).

## 7. Other things worth watching

- `app.loadLocalStorage` and `app.saveLocalStorage` store the remembered zoom (`src/editor/register-zoom.ts`). They are thin API. Guard: `e2e/obsidian-contract.e2e.ts` ("round-trips values through local storage").
- `app.workspace.updateOptions()` applies settings to open editors (`src/settings.ts`). Guard: the same contract spec.
- `editorInfoField` gives the note path of an editor (`src/editor/zoom-persistence.ts`, `src/editor/register-item-drag.ts`, `src/editor/callout-widget.ts`).
- Class names used as styling anchors in `styles.css`: `.markdown-source-view.mod-cm6`, `.cm-line`, `.cm-content`, `.cm-indent`, `.HyperMD-quote`, `.internal-embed`, `.markdown-embed-title`.
- Plain casts that are not Obsidian internals: `src/outline/list-item.ts` (regex match shape) and `src/editor/item-pointer.ts` (`EventListener`).
