import { EditorSelection, type EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { blockIdSpans, type IdSpan } from '../outline/block-id';

const hiddenId = Decoration.replace({});

/** Finds the trailing block ids of the list items in a document. */
export function findIdSpans(state: EditorState): IdSpan[] {
	return blockIdSpans(state.doc.toJSON(), state.tabSize);
}

/** Returns the line numbers the selection touches. */
function selectedLines(state: EditorState, selection: EditorSelection): Set<number> {
	const lines = new Set<number>();
	for (const range of selection.ranges) {
		const first = state.doc.lineAt(range.from).number - 1;
		const last = state.doc.lineAt(range.to).number - 1;
		for (let line = first; line <= last; line += 1) lines.add(line);
	}
	return lines;
}

/** Hides every block id except those on lines the selection touches. */
export function hiddenIdDecorations(state: EditorState, spans: readonly IdSpan[]): DecorationSet {
	const touched = selectedLines(state, state.selection);
	return Decoration.set(
		spans
			.filter((span) => !touched.has(span.lineIndex))
			.map((span) => {
				const lineStart = state.doc.line(span.lineIndex + 1).from;
				return hiddenId.range(lineStart + span.from, lineStart + span.to);
			}),
		true,
	);
}
