import { itemAtLine, itemStartingAt } from './item-lookup';
import { ownLastLine, textStartColumn } from './item-text';
import { lineAt } from './line-edit';
import { parseOutline } from './outline-tree';

export interface LinePosition {
	line: number;
	column: number;
}

export interface TextRange {
	from: LinePosition;
	to: LinePosition;
}

/** Returns the column Home moves to on an item's first line, or null when Home should do its usual move. */
export function homeColumn(
	lines: readonly string[],
	tabSize: number,
	lineIndex: number,
	column: number,
): number | null {
	if (!itemStartingAt(parseOutline(lines, tabSize), lineIndex)) return null;
	const start = textStartColumn(lineAt(lines, lineIndex));
	return start !== null && column > start ? start : null;
}

/** Returns the text of the item that holds a line, without its marker and children, or null. */
export function itemTextRange(
	lines: readonly string[],
	tabSize: number,
	lineIndex: number,
): TextRange | null {
	const item = itemAtLine(parseOutline(lines, tabSize), lineIndex);
	if (!item) return null;
	const last = ownLastLine(lines, item);
	const start = textStartColumn(lineAt(lines, item.startLine));
	if (start === null || lineIndex > last) return null;
	return {
		from: { line: item.startLine, column: start },
		to: { line: last, column: lineAt(lines, last).length },
	};
}
