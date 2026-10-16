import type { EditorView } from '@codemirror/view';
import type { Interval } from '../outline/pointer-hit';
import type { OutlineNode } from '../outline/outline-tree';

/** Returns the left edge of the marker of an item on screen, or null when it is not drawn. */
export function markerLeft(view: EditorView, item: OutlineNode): number | null {
	const line = view.state.doc.line(item.startLine + 1);
	return view.coordsAtPos(line.from + item.indent.length)?.left ?? null;
}

/** Returns the width of the marker of an item on screen, or null when it is not drawn. */
export function markerWidth(view: EditorView, item: OutlineNode): number | null {
	const line = view.state.doc.line(item.startLine + 1);
	const start = view.coordsAtPos(line.from + item.indent.length)?.left;
	const end = view.coordsAtPos(line.from + item.indent.length + item.marker.length)?.left;
	return start === undefined || end === undefined ? null : end - start;
}

/** Returns how far one level of nesting moves a marker to the right on screen. */
export function levelWidth(view: EditorView, item: OutlineNode): number {
	const own = markerLeft(view, item);
	const reference = item.parent ?? item.children[0];
	const other = reference ? markerLeft(view, reference) : null;
	if (own === null || other === null || own === other) return view.defaultCharacterWidth * 2;
	return Math.abs(own - other);
}

/** Returns the horizontal span of a range of a line, or null when it is not drawn. */
export function markerSpan(
	view: EditorView,
	startLine: number,
	from: number,
	to: number,
): Interval | null {
	const line = view.state.doc.line(startLine + 1);
	const start = view.coordsAtPos(line.from + from);
	const end = view.coordsAtPos(line.from + to);
	if (!start || !end) return null;
	return { left: start.left, right: end.left };
}

/** Returns the vertical span of the first row of a line, or null when it is not drawn. */
export function firstRow(
	view: EditorView,
	startLine: number,
): { top: number; bottom: number } | null {
	const coords = view.coordsAtPos(view.state.doc.line(startLine + 1).from);
	return coords ? { top: coords.top, bottom: coords.bottom } : null;
}
