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

/** Shifts the leading whitespace of a line by a column delta, leaving blank lines alone. */
export function shiftIndent(line: string, delta: number, style: IndentStyle): string {
	if (line.trim() === '') return line;
	const body = line.trimStart();
	const width = visualWidth(line.slice(0, line.length - body.length), style.tabSize);
	return writeIndent(Math.max(0, width + delta), style) + body;
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
	lines.slice(fromLine, toLine + 1).forEach((line, offset) => {
		const text = shiftIndent(line, delta, style);
		if (text !== line) edits.push({ lineIndex: fromLine + offset, text });
	});
	return edits;
}
