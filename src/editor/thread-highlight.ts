import type { Extension } from '@codemirror/state';
import { RectangleMarker, layer, type EditorView, type ViewUpdate } from '@codemirror/view';
import { itemStartingAt } from '../outline/item-lookup';
import { isFolded } from './fold-control';
import { editorFontSize, firstRow } from './item-geometry';
import { outlineOfState } from './outline-of-state';
import { threadHoverField } from './thread-hover-field';

const HIGHLIGHT_CLASS = 'flow-thread-highlight';
const BULLET_CLEARANCE_EMS = 0.4;

/** Returns the marker that draws the hovered thread line from just below the bullet of its parent to the bottom of its last descendant. */
function highlightMarkers(view: EditorView): readonly RectangleMarker[] {
	const hover = view.state.field(threadHoverField);
	if (!hover) return [];
	const item = itemStartingAt(outlineOfState(view.state), hover.startLine);
	if (!item || item.children.length === 0 || isFolded(view.state, hover.startLine)) return [];
	const doc = view.state.doc;
	const row = firstRow(view, item.startLine);
	if (!row) return [];
	const last = view.lineBlockAt(doc.line(item.endLine + 1).to);
	if (!last) return [];
	const scroller = view.scrollDOM;
	const origin = scroller.getBoundingClientRect();
	const left = hover.x - origin.left + scroller.scrollLeft;
	const start = (row.top + row.bottom) / 2 + editorFontSize(view) * BULLET_CLEARANCE_EMS;
	const top = start - origin.top + scroller.scrollTop;
	const height = last.bottom + view.documentTop - start;
	return [new RectangleMarker(HIGHLIGHT_CLASS, left, top, null, height)];
}

/** Tells whether an update can move or change the highlighted thread line. */
function needsRedraw(update: ViewUpdate): boolean {
	return (
		update.docChanged ||
		update.viewportChanged ||
		update.geometryChanged ||
		update.startState.field(threadHoverField) !== update.state.field(threadHoverField)
	);
}

/** Returns the extension that highlights the thread line the pointer is over. */
export function threadHighlight(): Extension {
	return [
		threadHoverField,
		layer({
			above: false,
			class: 'flow-thread-layer',
			update: needsRedraw,
			markers: highlightMarkers,
		}),
	];
}
