import { parseHeadings } from './headings';
import { itemStartingAt } from './item-lookup';
import { visualWidth } from './list-item';
import type { OutlineTree } from './outline-tree';
import type { ZoomRange } from './zoom';

/** Returns how many columns the zoomed item is indented, which is how far it moves to the left edge; a heading does not move. */
export function zoomIndentColumns(
	lines: readonly string[],
	tree: OutlineTree,
	tabSize: number,
	startLine: number,
): number {
	if (parseHeadings(lines).some((heading) => heading.line === startLine)) return 0;
	const item = itemStartingAt(tree, startLine);
	return item ? visualWidth(item.indent, tabSize) : 0;
}

/** Returns how many leading whitespace characters of a line cover the given number of columns, or all of its indent when that is less. */
export function hiddenIndentLength(text: string, tabSize: number, columns: number): number {
	if (columns <= 0) return 0;
	const indentLength = text.length - text.trimStart().length;
	for (let length = 1; length <= indentLength; length += 1) {
		if (visualWidth(text.slice(0, length), tabSize) >= columns) return length;
	}
	return indentLength;
}

/** Returns the zoomed lines that move left: the ones with content that are indented at least the given number of columns. */
export function shiftedLines(
	lines: readonly string[],
	tabSize: number,
	range: ZoomRange,
	columns: number,
): number[] {
	if (columns === 0) return [];
	const shifted: number[] = [];
	for (let line = range.fromLine; line <= range.toLine; line += 1) {
		const text = lines[line] ?? '';
		const indent = text.slice(0, text.length - text.trimStart().length);
		if (text.trim() !== '' && visualWidth(indent, tabSize) >= columns) shifted.push(line);
	}
	return shifted;
}
