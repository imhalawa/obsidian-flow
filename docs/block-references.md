# Block references

Findings from a spike in real Obsidian 1.14.4 on Linux, and the design that follows from them.

## Where Obsidian reads a block id

- Obsidian recognises ` ^id` only at the end of the item's own first paragraph: the last text line before the item's children, a blank line or a fence.
- On the first line of a multi-line item the id is not recognised. The plugin therefore writes the id at the end of the last text line of the item, before its children.
- The metadata cache lists the block after Obsidian saves the note and indexes it, which takes about two seconds after an edit.

## Design

- The note stays clean Markdown until the user asks for a link. `copy-item-link` appends ` ^id` to the item when it has none, in one transaction with its own undo step, and copies the link built by `generateMarkdownLink`.
- Ids are six base-36 characters and unique within the note. An existing id is kept and reused.
- A note that uses the same id twice shows "This block id is used more than once in the note." and the link is still copied.
- Ids are never removed automatically.
- The setting "Hide block ids" hides the id away from the cursor line. The hidden range is atomic, so the cursor skips over it. The text in the note is unchanged.
- Logseq `id::` and `collapsed::` properties are not read yet, because nothing consumes them. They come with a feature that needs them.
