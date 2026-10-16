import { parseHeadings } from './headings';
import { itemStartingAt } from './item-lookup';
import { indentDepth } from './list-item';
import { parseOutline } from './outline-tree';
import type { ZoomRange } from './zoom';

/** Returns how many levels the zoomed heading or item is indented, which is how far it moves to the left edge. */
export function zoomIndentLevels(
	lines: readonly string[],
	tabSize: number,
	startLine: number,
): number {
	if (parseHeadings(lines).some((heading) => heading.line === startLine)) return 0;
	const item = itemStartingAt(parseOutline(lines, tabSize), startLine);
	return item ? indentDepth(item.indent, tabSize) : 0;
}

/** Returns the zoomed lines that move left: the ones with content that are indented at least the given number of levels. */
export function shiftedLines(
	lines: readonly string[],
	tabSize: number,
	range: ZoomRange,
	levels: number,
): number[] {
	if (levels === 0) return [];
	const shifted: number[] = [];
	for (let line = range.fromLine; line <= range.toLine; line += 1) {
		const text = lines[line] ?? '';
		const indent = text.slice(0, text.length - text.trimStart().length);
		if (text.trim() !== '' && indentDepth(indent, tabSize) >= levels) shifted.push(line);
	}
	return shifted;
}
