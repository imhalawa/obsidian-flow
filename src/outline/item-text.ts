import { parseListItem } from './list-item';
import type { OutlineNode } from './outline-tree';

/** Returns the column where the text of a list item line starts, after the marker and checkbox. */
export function textStartColumn(line: string): number | null {
	const item = parseListItem(line);
	return item ? line.length - item.content.length : null;
}

/** Returns the last line that belongs to the item's own text, before its children and trailing blank lines. */
export function ownLastLine(lines: readonly string[], item: OutlineNode): number {
	const firstChild = item.children[0];
	let last = firstChild ? firstChild.startLine - 1 : item.endLine;
	while (last > item.startLine && (lines[last] ?? '').trim() === '') last -= 1;
	return last;
}
