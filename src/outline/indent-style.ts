import { visualWidth } from './list-item';
import type { LineEdit } from './line-edit';

export interface IndentStyle {
	useTabs: boolean;
	unitColumns: number;
	tabSize: number;
}

/** Writes an indent of the given column width in the note's indent style. */
export function writeIndent(columns: number, style: IndentStyle): string {
	if (!style.useTabs) return ' '.repeat(columns);
	return '\t'.repeat(Math.floor(columns / style.tabSize)) + ' '.repeat(columns % style.tabSize);
}

/** Shifts the leading whitespace of each non blank line in a range by a column delta. */
export function reindentLines(
	lines: readonly string[],
	fromLine: number,
	toLine: number,
	delta: number,
	style: IndentStyle,
): LineEdit[] {
	const edits: LineEdit[] = [];
	for (let lineIndex = fromLine; lineIndex <= toLine; lineIndex += 1) {
		const line = lines[lineIndex] ?? '';
		if (line.trim() === '') continue;
		const body = line.trimStart();
		const width = visualWidth(line.slice(0, line.length - body.length), style.tabSize);
		const text = writeIndent(Math.max(0, width + delta), style) + body;
		if (text !== line) edits.push({ lineIndex, text });
	}
	return edits;
}
