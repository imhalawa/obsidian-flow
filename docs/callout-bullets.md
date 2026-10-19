# Callout bullets

Findings from a spike in real Obsidian 1.14.4, and the design that follows from them.

## What Obsidian does

- A callout is drawn only when its `>` starts a line directly under a top-level bullet and is indented to the text of the bullet with spaces. It is then drawn without a bullet, from the left margin.
- A callout under a nested bullet, or indented with a tab, is drawn as an indented code block.
- `- > [!tip] Title`, a callout that is a bullet itself, is drawn as a plain bullet that shows the raw text.
- All of this is the same with the plugin switched off.

## What the plugin does

A bullet that holds a callout is drawn as a callout, with its bullet beside it. The bullet keeps its place in the list, so it nests, folds and zooms like any other bullet.

```md
- Why
    - > [!tip] Business pain or trigger
      > First line of the body
      > Second line of the body
    - A sibling bullet
```

- The first line is `- > [!type] Title`. The type sets the colour and icon through the theme. `[!tip]-` starts folded and `[!tip]+` starts open.
- The body lines start with `>` and are indented to the text of the bullet. A blank line, a line that is not a quote or a child bullet ends the callout.
- The callout is drawn by Obsidian's own markdown renderer, so the markup and the styling are Obsidian's: icons, theme colours, snippets, custom types, markdown and links in the title, lists in the body, the fold chevron.
- The plugin only places it: the callout starts after the bullet and fills the rest of the row, and the callout is moved down so its top border is level with the top of the bullet and the fold arrow.
- While the cursor is in the callout, or a selection reaches into it, the lines show their text, like a callout of Obsidian. Click a callout to put the cursor in it.
- A callout bullet that is followed by a child or a sibling draws an indentation line that starts just under its bullet and runs to the next bullet, so the bullets stay connected. Each callout keeps an 8 px space below it. A folded callout shows only its title.
- In a narrow pane the callout keeps a width of at least 10em. When the row is narrower, the callout drops below the bullet instead of being squeezed.
- The note text is never changed. Drawing a callout replaces nothing in the note.
- The setting "Show callout bullets as callouts" switches it off.

## What it leaves alone

A bullet that is ordered, a task, a quote inside a quote, a callout without a closing bracket, a plain quote bullet, a callout that is not a bullet and anything inside a code block or the front matter are drawn by Obsidian as before.

## Limits

- Obsidian draws a quote marker (`HyperMD-quote`) in front of the lines of a quote. The lines a callout replaces leave that marker on the line after the callout, so the plugin hides it on that line and on the callout line.
- Only the visible callouts are drawn into the page, so a note with many callouts stays fast.

## Implementation

`src/outline/callout.ts` finds the callout bullets from the outline tree (so code blocks and front matter are skipped). `src/editor/callout-decorations.ts` turns them into editor decorations. `src/editor/callout-bullets.ts` is the extension with the setting. `src/editor/callout-widget.ts` draws a callout with `MarkdownRenderer` and moves the bullet. `e2e/callout-bullets.e2e.ts` checks the layout in real Obsidian.
