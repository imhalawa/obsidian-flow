import type { Selection } from './note-editor';

export interface MarkedState {
	text: string;
	selection: Selection;
}

/** Splits a note written with | at the caret, or two | around a selection, into text and selection. */
export function parseMarked(marked: string): MarkedState {
	const first = marked.indexOf('|');
	const second = marked.indexOf('|', first + 1);
	const toPosition = (offset: number, text: string) => {
		const lines = text.slice(0, offset).split('\n');
		return { line: lines.length - 1, ch: lines[lines.length - 1]?.length ?? 0 };
	};
	if (second === -1) {
		const text = marked.replace('|', '');
		const position = toPosition(first, text);
		return { text, selection: { anchor: position, head: position } };
	}
	const text = marked.replace('|', '').replace('|', '');
	return {
		text,
		selection: { anchor: toPosition(first, text), head: toPosition(second - 1, text) },
	};
}

/** Writes a text and selection back into the | notation. */
export function renderMarked(text: string, selection: Selection): string {
	const offsetOf = (position: { line: number; ch: number }) => {
		const lines = text.split('\n');
		return (
			lines.slice(0, position.line).reduce((sum, line) => sum + line.length + 1, 0) +
			position.ch
		);
	};
	const anchor = offsetOf(selection.anchor);
	const head = offsetOf(selection.head);
	const from = Math.min(anchor, head);
	const to = Math.max(anchor, head);
	if (from === to) return `${text.slice(0, from)}|${text.slice(from)}`;
	return `${text.slice(0, from)}|${text.slice(from, to)}|${text.slice(to)}`;
}
