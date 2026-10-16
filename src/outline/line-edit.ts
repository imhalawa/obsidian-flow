export interface LineEdit {
	lineIndex: number;
	text: string;
}

export type RefusalReason =
	| 'not-a-list-item'
	| 'no-previous-sibling'
	| 'no-next-sibling'
	| 'top-level'
	| 'outside-zoom'
	| 'drop-into-self'
	| 'structure-check-failed';

export interface LineMove {
	fromLine: number;
	toLine: number;
	delta: number;
}

export interface Refusal {
	ok: false;
	reason: RefusalReason;
}

export type EditResult = { ok: true; edits: LineEdit[]; lineMoves: LineMove[] } | Refusal;

/** Returns a copy of the lines with each edit replacing the text of its line. */
export function applyEdits(lines: readonly string[], edits: readonly LineEdit[]): string[] {
	const result = [...lines];
	for (const edit of edits) result[edit.lineIndex] = edit.text;
	return result;
}

/** Builds a refusal result. */
export function refuse(reason: RefusalReason): Refusal {
	return { ok: false, reason };
}

/** Returns where a line ends up after a set of simultaneous line moves. */
export function mapLine(lineIndex: number, moves: readonly LineMove[]): number {
	const move = moves.find(
		(candidate) => candidate.fromLine <= lineIndex && lineIndex <= candidate.toLine,
	);
	return move ? lineIndex + move.delta : lineIndex;
}

/** Returns the line at an index, or an empty string past the ends. */
export function lineAt(lines: readonly string[], lineIndex: number): string {
	return lines[lineIndex] ?? '';
}

/** Returns where a line ends up after a sequence of move steps. */
export function mapLineThrough(lineIndex: number, steps: readonly (readonly LineMove[])[]): number {
	return steps.reduce((line, moves) => mapLine(line, moves), lineIndex);
}
