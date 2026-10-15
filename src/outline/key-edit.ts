export interface KeyEdit {
	fromLine: number;
	toLine: number;
	text: string;
	caret: number;
}

/** Builds the edit that turns one version of the lines into another with the same line count; the caret offset counts into the new text. */
export function spanEdit(
	before: readonly string[],
	after: readonly string[],
	caretLine: number,
	caretColumn: number,
): KeyEdit | null {
	const changed = after.flatMap((text, index) => (text === before[index] ? [] : [index]));
	const first = changed[0];
	const last = changed[changed.length - 1];
	if (first === undefined || last === undefined) return null;
	const fromLine = Math.min(first, caretLine);
	const toLine = Math.max(last, caretLine);
	const offsetOfCaretLine = after
		.slice(fromLine, caretLine)
		.reduce((sum, text) => sum + text.length + 1, 0);
	return {
		fromLine,
		toLine,
		text: after.slice(fromLine, toLine + 1).join('\n'),
		caret: offsetOfCaretLine + caretColumn,
	};
}
