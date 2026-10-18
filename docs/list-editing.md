# List editing keys

Five editor keys act on list items, and one optional pair moves whole items. Each key applies only when it has something to do and otherwise leaves the key to Obsidian. Each one has a setting under **List editing**.

| Key                          | When                                                       | What it does                                                                                             | Setting                                             |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Enter                        | Cursor at the end of an empty item                         | Outdents the item, or ends the list at the top level                                                     | Enter on an empty item outdents it                  |
| Enter                        | Cursor at the end of the own text of an item with children | Adds a new first child, as an unchecked task when the first child is a task; unfolds a folded item first | Enter on an item with children adds its first child |
| Backspace                    | Cursor at the start of the item text                       | Merges the item into the item above, with the cursor at the join                                         | Backspace at the start of an item merges it         |
| Home, Shift-Home             | Cursor in the text of an item's first line                 | Moves to the start of the item text, then to the start of the line                                       | Home stays inside the item text                     |
| Select all (Ctrl-A or Cmd-A) | Cursor in an item whose text is not fully selected         | Selects the item text; pressing again selects the whole note                                             | Select all starts with the item text                |
| Tab, Shift-Tab               | Cursor in an item                                          | Indents or outdents the item together with its children (off default)                                    | Tab and Shift-Tab move whole items                  |

## The bullet stays out of the text

Like in Logseq, the bullet is its own object and not part of the text you edit. With **Keep the bullet out of text selections** on (the default):

- A cursor or selection end that lands in the indent or marker of an item (`- `, `1. `, `- [ ] `) moves to the start of the item text. This covers mouse drags, Shift with the arrow keys, double and triple click, and commands.
- The left arrow at the start of the text goes to the end of the line above, since there is nothing to the left to step over.
- Backspace at the start of the text that cannot merge (the item has children, the first item of a note, no item above) does nothing, so it never eats the bullet. A merge that is possible still happens as described above.
- A selection of several lines still holds the bullets of the lines it spans, so copying it gives valid Markdown. Only its ends are kept in the text.

Logseq does this structurally, with one text box for each block. Roamer cannot, because the bullet is real text of the note, so a selection transaction filter (`src/editor/bullet-selection.ts`) moves the ends instead. The decision is a pure function in `src/outline/text-clamp.ts`.

## Limits

- Backspace merges only an item that has no children and one line. It merges only into an item line directly above, never across a blank line or into a continuation line. Anything else is left to Obsidian.
- A multi-line selection that ends on an item always includes that item's bullet in its range, because the text between lines includes it.
- Home leaves wrapped rows alone, so it still goes to the start of the visual row.
- Every key does nothing with several cursors, with a selection (except Home with Shift and select all), and during text composition.
- In a zoomed item a key never changes lines outside the zoom.
- While you are zoomed, select all goes item text first, then the zoomed item with everything under it, and stops there. It never selects the hidden lines.
- Enter adds a first child only when the first child is a bullet or a task; with an ordered first child Obsidian's own Enter applies.
- Obsidian 1.14 already ends or outdents an empty item on Enter, so that key mostly makes the behavior independent of Obsidian's own.

## Implementation

The decisions are pure functions in `src/outline/` (`enter-key.ts`, `backspace-key.ts`, `home-select.ts`). They return one replacement of whole lines plus the cursor offset, and `src/editor/list-keys.ts` applies it as one transaction, so undo takes it back in one step. `src/editor/register-list-keys.ts` binds the keys at high precedence and checks the settings.
