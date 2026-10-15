import { lineAt, mapLineThrough, type LineMove } from './line-edit';
import { mapColumn, minimalChange } from './line-change';

export interface TextPosition {
	line: number;
	ch: number;
}

/** Maps a position through line moves and the indent changes of the lines it sits on. */
export function mapPosition(
	before: readonly string[],
	after: readonly string[],
	steps: readonly (readonly LineMove[])[],
	position: TextPosition,
): TextPosition {
	const line = mapLineThrough(position.line, steps);
	const change = minimalChange(lineAt(before, position.line), lineAt(after, line));
	return { line, ch: mapColumn(change, position.ch) };
}
