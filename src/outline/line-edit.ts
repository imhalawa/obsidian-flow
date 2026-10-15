export interface LineEdit {
	lineIndex: number;
	text: string;
}

export type RefusalReason =
	| 'not-a-list-item'
	| 'no-previous-sibling'
	| 'no-next-sibling'
	| 'top-level'
	| 'structure-check-failed';

export type EditResult = { ok: true; edits: LineEdit[] } | { ok: false; reason: RefusalReason };

/** Returns a copy of the lines with each edit replacing the text of its line. */
export function applyEdits(lines: readonly string[], edits: readonly LineEdit[]): string[] {
	const result = [...lines];
	for (const edit of edits) result[edit.lineIndex] = edit.text;
	return result;
}

/** Builds a refusal result. */
export function refuse(reason: RefusalReason): EditResult {
	return { ok: false, reason };
}
