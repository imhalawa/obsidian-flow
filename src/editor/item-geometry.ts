import type { EditorView } from '@codemirror/view';
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
