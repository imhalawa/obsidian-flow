# Bullets and thread lines

Findings from a spike in real Obsidian 1.14.4 on Linux, and the design that follows from them.

## What Obsidian already draws

- Live Preview draws the bullet, a ring around the bullet of a folded item, a fold arrow beside the bullet and thin vertical lines beside the children of an item. They follow `--list-marker-color-collapsed`, `--indentation-guide-color` and the other list variables.
- The plugin does not draw its own copies. It adds behavior to what is there, so themes and Obsidian updates keep control of the look.

## What the plugin adds

- Clicking a bullet zooms into the item. Bullets of ordered items and tasks are not bullets, so they do nothing.
- Clicking the thread line of a parent folds its branch. Alt-click folds every descendant that has children. A folded branch hides its lines, so unfolding goes through the fold arrow, the bullet menu or the commands.
- Right-clicking a bullet (and a long press, which the browser reports as the same event) opens a menu with Zoom into item, Fold item or Unfold item, and Copy link to item.
- The pointer shows the clickable cursor over a bullet or thread line, and the hovered thread line is drawn in the accent color from its parent to its last descendant. The highlight is a CodeMirror layer placed at the middle of the parent's bullet, so it does not depend on Obsidian's indent markup, which splits indents into spans that differ between tabs and spaces.
- The pointer also shows the clickable cursor over the fold arrow. The bullet of a row lights up in the same way Obsidian lights it when its arrow is hovered, and stays lit while the pointer moves through the left gutter of the row, over the arrow and onto the bullet. A thread line wins over the light, so hovering a thread line never lights a bullet. The light is a line decoration set from the pointer position, so it does not flicker when the pointer crosses from the arrow to the bullet.
- Hit areas are at least 24 px wide, and the plugin reads positions from CodeMirror (`coordsAtPos`, `lineBlockAt`). The one Obsidian class it reads is `.cm-fold-indicator`: a thread line click yields to Obsidian's fold arrow when the pointer is over the arrow, because the 24 px thread zone overlaps the arrow's left edge. If Obsidian renames the class the arrow loses that protection, and an end-to-end test fails.

## Embeds in bullets

- Live Preview draws an embed (`![[Note]]`, `![[Note#Heading]]`, `![[Note#^id]]`, a PDF, audio, video, canvas) as a block inside the line of its item. The bullet then sits alone on a first row, the card starts on the row below, and a trailing empty row follows it.
- The plugin marks every list item whose whole content is one embed (a trailing block id is allowed) with the `flow-embed-line` class. The stylesheet makes the embed an inline block of the full line width, so the card shares the bullet's row and the empty rows are gone. The bullet stays at the top edge of the embed.
- Items with text around the embed are left as Obsidian draws them.
- The markdown stays editable the way Obsidian offers it: clicking the card or moving the caret into the item with the arrow keys shows the source on the first row, and the embed wraps below it until the caret leaves.
- The one Obsidian class the stylesheet reads is `.internal-embed`. Which lines to mark is decided by a pure function on the text, so a renamed class only loses the layout fix and an end-to-end test fails.

## Why the listeners sit in the capture phase

- Obsidian's fold arrow is a widget whose box overlaps the bullet of nested items. CodeMirror hands no events from inside a widget to editor handlers, so a normal handler never saw a click on a nested bullet and Obsidian folded the item instead.
- The plugin listens on the editor element in the capture phase, decides from the pointer position, and stops the event only when it acts. A click on the fold arrow itself still folds and unfolds the item it belongs to, which end-to-end tests check, including the left edge of the arrow that the thread zone overlaps.

## Limits

- Only Live Preview is affected. Source mode shows the raw `-`, which stays plain text.
- A thread line can be clicked while its parent line is drawn. For a very long branch scrolled far past its parent, use the fold arrow or a command.
- Long press and touch hit areas follow the browser's own event model and are not tested on a phone in this environment.
