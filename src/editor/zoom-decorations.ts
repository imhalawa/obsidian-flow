import { type EditorState, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { zoomField, type ZoomState } from './zoom-field';

const hiddenLines = Decoration.replace({ block: true });

/** Returns the range of the lines hidden above the zoom, or null when the zoom starts the note. */
function aboveRange(zoom: ZoomState): Range<Decoration> | null {
	return zoom.from > 1 ? hiddenLines.range(0, zoom.from - 1) : null;
}

/** Returns the range of the lines hidden below the zoom, starting on the next line so no hidden range touches the end of the last zoomed line, or null when the zoom ends the note. */
function belowRange(zoom: ZoomState, docLength: number): Range<Decoration> | null {
	if (zoom.to >= docLength) return null;
	const start = zoom.to + 1 < docLength ? zoom.to + 1 : zoom.to;
	return hiddenLines.range(start, docLength);
}

/** Returns the replacements that hide everything outside the zoomed range. */
export function hiddenDecorations(state: EditorState): DecorationSet {
	const zoom = state.field(zoomField);
	if (!zoom) return Decoration.none;
	const ranges = [aboveRange(zoom), belowRange(zoom, state.doc.length)];
	return Decoration.set(ranges.filter((range): range is Range<Decoration> => range !== null));
}
