import { type EditorState, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { zoomField, type ZoomState } from './zoom-field';

const hiddenLines = Decoration.replace({ block: true });

/** Returns the range of the lines hidden above the zoom, or null when the zoom starts the note. */
function aboveRange(zoom: ZoomState): Range<Decoration> | null {
	return zoom.from > 1 ? hiddenLines.range(0, zoom.from - 1) : null;
}

/** Returns the range of the lines hidden below the zoom, or null when the zoom ends the note. */
function belowRange(zoom: ZoomState, docLength: number): Range<Decoration> | null {
	return zoom.to < docLength ? hiddenLines.range(zoom.to, docLength) : null;
}

/** Returns the replacements that hide everything outside the zoomed range. */
export function hiddenDecorations(state: EditorState): DecorationSet {
	const zoom = state.field(zoomField);
	if (!zoom) return Decoration.none;
	const ranges = [aboveRange(zoom), belowRange(zoom, state.doc.length)];
	return Decoration.set(ranges.filter((range): range is Range<Decoration> => range !== null));
}
