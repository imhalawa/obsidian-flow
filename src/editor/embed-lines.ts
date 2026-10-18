import { RangeSetBuilder, type EditorState, type Extension } from '@codemirror/state';
import {
	Decoration,
	ViewPlugin,
	type DecorationSet,
	type EditorView,
	type ViewUpdate,
} from '@codemirror/view';
import { isEmbedItem } from '../outline/embed-item';

export const EMBED_LINE_CLASS = 'roamer-embed-line';
export const EMBED_UNTITLED_CLASS = 'roamer-embed-untitled';

const titledLine = Decoration.line({ class: EMBED_LINE_CLASS });
const untitledLine = Decoration.line({ class: `${EMBED_LINE_CLASS} ${EMBED_UNTITLED_CLASS}` });

/** Returns the line decorations that mark the list items that hold only an embed, and ask to hide the embed title when told to. */
export function embedLineDecorations(state: EditorState, hideTitles: boolean): DecorationSet {
	const decoration = hideTitles ? untitledLine : titledLine;
	const builder = new RangeSetBuilder<Decoration>();
	for (let number = 1; number <= state.doc.lines; number += 1) {
		const line = state.doc.line(number);
		if (isEmbedItem(line.text)) builder.add(line.from, line.from, decoration);
	}
	return builder.finish();
}

/** Returns the extension that lets the stylesheet lay out an embed beside the bullet of its item. */
export function embedLines(hideTitles: () => boolean): Extension {
	return ViewPlugin.define(
		(view: EditorView) => {
			let hidden = hideTitles();
			let decorations = embedLineDecorations(view.state, hidden);
			return {
				get decorations() {
					return decorations;
				},
				update(update: ViewUpdate) {
					const wasHidden = hidden;
					hidden = hideTitles();
					if (update.docChanged || hidden !== wasHidden) {
						decorations = embedLineDecorations(update.state, hidden);
					}
				},
			};
		},
		{ decorations: (value) => value.decorations },
	);
}
