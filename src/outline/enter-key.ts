import { itemStartingAt } from './item-lookup';
import { outdentItem } from './indent';
import type { IndentStyle } from './indent-style';
import { ownLastLine } from './item-text';
import { spanEdit, type KeyEdit } from './key-edit';
import { applyEdits, lineAt } from './line-edit';
import { parseOutline } from './outline-tree';

/** Returns the edit for Enter at the end of an empty item: outdent it, or end the list at the top level. */
export function enterOnEmptyItem(
	lines: readonly string[],
	style: IndentStyle,
	lineIndex: number,
	column: number,
): KeyEdit | null {
	const item = itemStartingAt(parseOutline(lines, style.tabSize), lineIndex);
	const text = lineAt(lines, lineIndex);
	if (!item || item.text !== '' || column !== text.length) return null;
	if (item.children.length > 0 || ownLastLine(lines, item) !== lineIndex) return null;
	if (!item.parent) {
		return spanEdit(lines, applyEdits(lines, [{ lineIndex, text: '' }]), lineIndex, 0);
	}
	const outdented = outdentItem(lines, style, lineIndex);
	if (!outdented.ok) return null;
	const after = applyEdits(lines, outdented.edits);
	return spanEdit(lines, after, lineIndex, lineAt(after, lineIndex).length);
}
