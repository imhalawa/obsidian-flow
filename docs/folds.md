# Folds

Findings from a spike in real Obsidian 1.14.4 on Linux, and the design that follows from them.

## What Obsidian does with folds

- Folding a list item adds a range to the CodeMirror fold state (`foldEffect` from `@codemirror/language`). The range starts at the end of the item's first line and ends at the end of its last descendant line.
- Obsidian persists folds itself. `app.foldManager` saves and loads them per note, and a note closed and opened again comes back folded. `view.currentMode.getFoldInfo()` reports them as `{ folds: [{ from, to }], lines }` in line numbers.
- Folds made by plugin code through `foldEffect` are saved the same way, because Obsidian reads the fold state when it saves.

## Design

- The plugin never stores folds. Two writers would fight, so it defers to Obsidian. There is no "Remember folds per note" setting.
- The plugin folds with `foldEffect` and `unfoldEffect` over the exact range Obsidian uses, so its folds, the fold indicators and the built-in fold commands agree. An end-to-end test compares the plugin's fold with Obsidian's own `toggleFold`.
- Fold state lives in the editor, not in the zoom, so folds made while zoomed are still there after zooming out, and a folded item is still folded when zoomed into.
- A fold that would hide the zoomed item is dropped (for example Obsidian's own fold all while zoomed), and zooming into an item unfolds the folds that hide it.
- Fold all and unfold all act on the visible lines when zoomed.
- Lines that an unfold shows again are marked with `roamer-line-revealed` for 600 ms and fade in with Obsidian's animation variables. Folding cannot animate the same way, because CodeMirror removes the hidden lines at once. The marks and the arrow transitions are off when the user prefers reduced motion.
