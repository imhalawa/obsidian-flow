# Drag and drop

Press a bullet and move the pointer to drag the item with its children. There is no handle in the margin: the bullet is the only control. A press that is released without moving still zooms into the item.

![Dragging an item in the light theme](screenshots/drag-and-drop-light.png)

![Dragging an item in the dark theme](screenshots/drag-and-drop-dark.png)

## Where the item lands

A line shows where it lands while you drag. It follows the pointer:

- Over the upper half of an item: before that item.
- Over the lower half of an item that has no children, or is folded: after it, at its level.
- Over the lower half of an item that shows its children: as its first child.
- Over the text, the horizontal position picks the level. Move the pointer over the bullet of the item for its level, a level to the right to make the dragged item a child, or to the left to climb out of the parents the item ends. Keep the pointer in the margin to use the default.
- Over the item itself or one of its children: nowhere. The note stays as it is.

Press Escape before releasing the button to cancel.

The drop is one change, so one undo puts everything back. The setting **Drag items by their bullet** under **Bullets and thread lines** turns dragging on and off.

## Between notes

Drop the item on another open note, for example in a split pane. The destination note is written first and the item is removed from the source second, so a failure in between leaves a copy and never loses the item. Undo is two steps, one in each note. Two panes that show the same note count as one note.

## How it works

- The pointer handler finds the bullet from the position of the pointer in the text, not from Obsidian's own elements. A drag starts once the pointer has moved 4 px from where it was pressed.
- The pointer is followed with listeners on the `ownerDocument`, so pop-out windows work.
- Targets come from `posAtCoords`, `lineBlockAt` and `coordsAtPos`. The drop indicator is a CodeMirror layer.
- The move is a pure function (`src/outline/move-subtree.ts`) that takes the item out, puts it in the new place and checks the result against a re-parse before anything is written. A property test compares it with Lezer for every item and every place of generated notes.
- Folded items stay folded after the move.

## Limits

- The editor does not scroll while you drag. Move the item in steps, or zoom into a part of the note.
- Folds of a subtree that moves to another note are not carried along.
- Touch screens do not drag: a touch on a bullet only zooms, so scrolling stays predictable. Use the move up and move down commands there. Keyboard users have the same commands.
