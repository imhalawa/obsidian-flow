import { RangeSetBuilder, type EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { shiftedLines, zoomIndentLevels } from '../outline/zoom-shift';
import { zoomField } from './zoom-field';

export const ZOOM_LINE_CLASS = 'flow-zoom-line';
export const ZOOM_LEVELS_PROPERTY = '--flow-zoom-levels';

/** Returns how many indent levels the zoomed lines move to the left, or 0 when nothing moves. */
export function zoomedLevels(state: EditorState): number {
	const zoom = state.field(zoomField, false);
	if (!zoom) return 0;
	return zoomIndentLevels(
		state.doc.toJSON(),
		state.tabSize,
		state.doc.lineAt(zoom.from).number - 1,
	);
}

/** Returns the line decorations that mark the zoomed lines that move to the left edge, each with the number of levels it moves. */
export function cleanZoomDecorations(state: EditorState): DecorationSet {
	const zoom = state.field(zoomField, false);
	if (!zoom) return Decoration.none;
	const lines = state.doc.toJSON();
	const startLine = state.doc.lineAt(zoom.from).number - 1;
	const levels = zoomIndentLevels(lines, state.tabSize, startLine);
	const range = { fromLine: startLine, toLine: state.doc.lineAt(zoom.to).number - 1 };
	const decoration = Decoration.line({
		class: ZOOM_LINE_CLASS,
		attributes: { style: `${ZOOM_LEVELS_PROPERTY}: ${levels}` },
	});
	const builder = new RangeSetBuilder<Decoration>();
	for (const line of shiftedLines(lines, state.tabSize, range, levels)) {
		builder.add(state.doc.line(line + 1).from, state.doc.line(line + 1).from, decoration);
	}
	return builder.finish();
}
