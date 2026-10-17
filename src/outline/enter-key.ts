import { itemAtLine, itemStartingAt } from './item-lookup';
import { outdentItem } from './indent';
import type { IndentStyle } from './indent-style';
import { ownLastLine } from './item-text';
import { spanEdit, type KeyEdit } from './key-edit';
import { applyEdits, lineAt } from './line-edit';
import { parseListItem } from './list-item';
import { parseOutline } from './outline-tree';

const ORDERED_MARKER = /^\d/;

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

/** Returns the edit for Enter at the end of the own text of an item that has children: a new first child, as a bullet or an unchecked task like the first child. */
export function enterOnParentItem(
	lines: readonly string[],
	tabSize: number,
	lineIndex: number,
	column: number,
): KeyEdit | null {
	const item = itemAtLine(parseOutline(lines, tabSize), lineIndex);
	const firstChild = item?.children[0];
	const text = lineAt(lines, lineIndex);
	if (!item || !firstChild || column !== text.length || ownLastLine(lines, item) !== lineIndex) {
		return null;
	}
	const sample = parseListItem(lineAt(lines, firstChild.startLine));
	if (!sample || ORDERED_MARKER.test(sample.marker)) return null;
	const added = `${sample.indent}${sample.marker}${sample.gap}${sample.checked === null ? '' : '[ ] '}`;
	return {
		fromLine: lineIndex,
		toLine: lineIndex,
		text: `${text}\n${added}`,
		caret: text.length + 1 + added.length,
	};
}
