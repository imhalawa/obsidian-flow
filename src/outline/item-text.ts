import { lineAt } from './line-edit';
import type { OutlineNode } from './outline-tree';

/** Returns the column where the text of an item's first line starts, after the marker and checkbox. */
export function textStartColumn(lines: readonly string[], item: OutlineNode): number {
	return textStartColumnOf(lineAt(lines, item.startLine), item);
}

/** Returns the column where the text of an item starts in its first line. */
export function textStartColumnOf(firstLine: string, item: OutlineNode): number {
	return firstLine.length - item.text.length;
}

/** Returns the last line that belongs to the item's own text, before its children and trailing blank lines. */
export function ownLastLine(lines: readonly string[], item: OutlineNode): number {
	const firstChild = item.children[0];
	let last = firstChild ? firstChild.startLine - 1 : item.endLine;
	while (lineAt(lines, last).trim() === '') last -= 1;
	return last;
}
