# Bullets and thread lines

Findings from a spike in real Obsidian 1.14.4 on Linux, and the design that follows from them.

## What Obsidian already draws

- Live Preview draws the bullet, a ring around the bullet of a folded item, a fold arrow beside the bullet and thin vertical lines beside the children of an item. They follow `--list-marker-color-collapsed`, `--indentation-guide-color` and the other list variables.
- The plugin does not draw its own copies. It adds behavior to what is there, so themes and Obsidian updates keep control of the look.

## What the plugin adds

- Clicking a bullet zooms into the item. Bullets of ordered items and tasks are not bullets, so they do nothing.
- Clicking the thread line of a parent folds its branch. Alt-click folds every descendant that has children. A folded branch hides its lines, so unfolding goes through the fold arrow, the bullet menu or the commands.
- Right-clicking a bullet (and a long press, which the browser reports as the same event) opens a menu with Zoom into item, Fold item or Unfold item, and Copy link to item.
- The pointer shows the clickable cursor over a bullet or thread line.
- Hit areas are at least 24 px wide, and the plugin reads positions from CodeMirror (`coordsAtPos`, `lineBlockAt`), never from Obsidian class names.

## Why the listeners sit in the capture phase

- Obsidian's fold arrow is a widget whose box overlaps the bullet of nested items. CodeMirror hands no events from inside a widget to editor handlers, so a normal handler never saw a click on a nested bullet and Obsidian folded the item instead.
- The plugin listens on the editor element in the capture phase, decides from the pointer position, and stops the event only when it acts. A click on the fold arrow itself still folds, which an end-to-end test checks.

## Limits

- Only Live Preview is affected. Source mode shows the raw `-`, which stays plain text.
- A thread line can be clicked while its parent line is drawn. For a very long branch scrolled far past its parent, use the fold arrow or a command.
- Long press and touch hit areas follow the browser's own event model and are not tested on a phone in this environment.
