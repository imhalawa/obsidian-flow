import { textStartColumnOf } from './item-text';
import type { OutlineNode } from './outline-tree';

/** Returns the column to use for a position on a line: the start of the item text when the position is inside the item's indent or marker, otherwise the column itself. */
export function clampToItemText(
	lineText: string,
	item: OutlineNode | null,
	column: number,
): number {
	if (!item) return column;
	const start = textStartColumnOf(lineText, item);
	return column < start ? start : column;
}

/** Tells whether a column is exactly where the text of an item starts on its first line. */
export function isAtItemTextStart(
	lineText: string,
	item: OutlineNode | null,
	column: number,
): boolean {
	return item !== null && textStartColumnOf(lineText, item) === column;
}
