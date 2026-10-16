import { RangeSetBuilder, type EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { shiftedLines, zoomIndentColumns } from '../outline/zoom-shift';
import { outlineOfState } from './outline-of-state';
import { zoomField } from './zoom-field';

export const ZOOM_LINE_CLASS = 'flow-zoom-line';

const zoomLine = Decoration.line({ class: ZOOM_LINE_CLASS });

/** Returns the line decorations that mark the zoomed lines that move to the left edge. */
export function cleanZoomDecorations(state: EditorState): DecorationSet {
	const zoom = state.field(zoomField, false);
	if (!zoom) return Decoration.none;
	const lines = state.doc.toJSON();
	const startLine = state.doc.lineAt(zoom.from).number - 1;
	const columns = zoomIndentColumns(lines, outlineOfState(state), state.tabSize, startLine);
	const range = { fromLine: startLine, toLine: state.doc.lineAt(zoom.to).number - 1 };
	const builder = new RangeSetBuilder<Decoration>();
	for (const line of shiftedLines(lines, state.tabSize, range, columns)) {
		builder.add(state.doc.line(line + 1).from, state.doc.line(line + 1).from, zoomLine);
	}
	return builder.finish();
}
