import { RangeSetBuilder, type EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { hiddenIndentLength, shiftedLines, zoomIndentColumns } from '../outline/zoom-shift';
import { outlineOfState } from './outline-of-state';
import { zoomField } from './zoom-field';

export const ZOOM_LINE_CLASS = 'roamer-zoom-line';

export const HIDDEN_INDENT_CLASS = 'roamer-zoom-hidden-indent';

// TODO(obsidian-update): clean zoom shifts CodeMirror lines in CSS and hides the indent they leave behind; Obsidian layout changes can break it. See docs/obsidian-internals.md.
const zoomLine = Decoration.line({ class: ZOOM_LINE_CLASS });
const hiddenIndent = Decoration.mark({ class: HIDDEN_INDENT_CLASS });

/** Returns the decorations that mark the zoomed lines that move to the left edge and hide the indent they leave behind. */
export function cleanZoomDecorations(state: EditorState): DecorationSet {
	const zoom = state.field(zoomField, false);
	if (!zoom) return Decoration.none;
	const lines = state.doc.toJSON();
	const startLine = state.doc.lineAt(zoom.from).number - 1;
	const columns = zoomIndentColumns(lines, outlineOfState(state), state.tabSize, startLine);
	const range = { fromLine: startLine, toLine: state.doc.lineAt(zoom.to).number - 1 };
	const builder = new RangeSetBuilder<Decoration>();
	for (const line of shiftedLines(lines, state.tabSize, range, columns)) {
		const { from, text } = state.doc.line(line + 1);
		builder.add(from, from, zoomLine);
		const hidden = hiddenIndentLength(text, state.tabSize, columns);
		if (hidden > 0) builder.add(from, from + hidden, hiddenIndent);
	}
	return builder.finish();
}
