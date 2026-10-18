# Zoom

Zoom shows one list item, or one heading, and everything under it. Everything else in the note is hidden, not changed.

![A zoomed item with its path above the text, light theme](screenshots/zoom-path-light.png)

![A zoomed item with its path above the text, dark theme](screenshots/zoom-path-dark.png)

## What you can zoom into

- **A list item.** Select its bullet, or run **Zoom in** with the cursor in the item. The deepest item at the cursor is chosen.
- **A heading.** Right-click the heading and choose **Zoom in** (it is the last entry of the editor menu, and it appears on list items too), or run **Zoom in** with the cursor on a heading or in text under it that is not in a list item. The zoom covers the heading line down to the line before the next heading of the same or a higher level. Lines inside code fences and front matter are never read as headings.

![The editor menu of a heading with Zoom in at the end](screenshots/heading-menu-light.png)

**Zoom out** goes up one step: from an item to its parent item, then to the heading it sits under, then to the next heading above, then to the whole note.

## The path above the text

While you are zoomed, a panel above the text shows the path, starting with the note name:

`Test > Some Idea > Bullet 2 > Bullet 3`

- Headings above the zoomed target come first, outermost first, then list items down to the target. Headings are shown without their `#` marks, and an empty item as "Empty item".
- Select a level to zoom to it. The last level is the current one and is not a link. Select the note name to show the whole note, or use **Show the whole note** or the mouse back button.
- When the path is wider than the panel, the first level and the current level stay and the levels between them collapse into one `…` crumb. Select it (or Tab to it and press Enter or Space) for a menu of the hidden levels, top down.
- If it still does not fit, text shrinks in this order: the first level, the current level. The full text is the tooltip and the accessible label.
- Each pane has its own path. The note name follows renames, and the panel is removed when the plugin is turned off.

## The zoomed item at the left edge

When the zoomed item is nested, it moves to the left edge of the note and the indent guides of the levels above it are not drawn. Guides inside the zoomed part stay. The setting **Show the zoomed item at the left edge** turns this off.

## Remembering the zoom

Zoom is remembered per note as a structural address (heading text, item text and position among equal siblings), so it survives edits above it and a restart. It is stored in the local storage of the vault on the device, never in the note.

## How it works

- The zoom is a CodeMirror state field. The text outside it is hidden with block replace decorations, which also keeps the cursor inside the zoom.
- Headings, ranges, paths and addresses are pure functions in `src/outline/` (`headings.ts`, `zoom-view.ts`, `zoom-anchor.ts`) with tables of test cases.
- The path is a CodeMirror panel above the text (`showPanel`, `src/editor/zoom-panel.ts`, `src/ui/crumb-path.ts`). It uses only public CodeMirror API and no Obsidian header class, and it also works on mobile. The first crumb is the note name and shows the whole note. Which levels hide is decided by a pure function (`src/ui/fit-crumbs.ts`) from measured widths.
- The shift to the left edge is a line class with the number of levels, multiplied by the width of one indent level measured from the editor, so it follows the theme's indent width.

## Limits

- The path takes one line above the text of the note while you are zoomed. The native note title is not changed.
- The left edge shift is measured from the indent the editor draws, so a theme that draws a very different indent width can show a small offset.
