import { itemStartingAt } from './item-lookup';
import { ownLastLine, textStartColumn } from './item-text';
import type { KeyEdit } from './key-edit';
import { lineAt } from './line-edit';
import { parseOutline } from './outline-tree';

/** Returns the edit for Backspace at the start of an item's text: merge it into the item above. */
export function backspaceAtItemStart(
	lines: readonly string[],
	tabSize: number,
	lineIndex: number,
	column: number,
): KeyEdit | null {
	const tree = parseOutline(lines, tabSize);
	const item = itemStartingAt(tree, lineIndex);
	if (!item || textStartColumn(lines, item) !== column) return null;
	if (item.children.length > 0 || ownLastLine(lines, item) !== lineIndex) return null;
	if (!itemStartingAt(tree, lineIndex - 1)) return null;
	const above = lineAt(lines, lineIndex - 1);
	return {
		fromLine: lineIndex - 1,
		toLine: lineIndex,
		text: above + item.text,
		caret: above.length,
	};
}
