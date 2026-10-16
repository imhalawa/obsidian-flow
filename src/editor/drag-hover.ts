import type { EditorView } from '@codemirror/view';
import { dropDestination, type LineSpan } from '../outline/drop-target';
import { itemAtLine } from '../outline/item-lookup';
import type { DropDestination } from '../outline/move-subtree';
import type { OutlineNode } from '../outline/outline-tree';
import { isFolded } from './fold-control';
import { levelWidth, markerLeft, markerWidth } from './item-geometry';
import { outlineOfState } from './outline-of-state';

/** Returns how many levels the pointer is from the marker of an item; zero while it is left of the text. */
function depthShiftAt(view: EditorView, item: OutlineNode, x: number): number {
	const left = markerLeft(view, item);
	const width = markerWidth(view, item);
	if (left === null || width === null || x < view.contentDOM.getBoundingClientRect().left) {
		return 0;
	}
	return Math.round((x - (left + width / 2)) / levelWidth(view, item));
}

/** Decides where a dragged item would land for a pointer at a point of the window. */
export function destinationAt(
	view: EditorView,
	source: LineSpan | null,
	x: number,
	y: number,
): DropDestination | null {
	const position = view.posAtCoords({ x, y }, false);
	const line = view.state.doc.lineAt(position);
	const tree = outlineOfState(view.state);
	const item = itemAtLine(tree, line.number - 1);
	if (!item) return null;
	const block = view.lineBlockAt(position);
	const offsetInBlock = y - view.documentTop - block.top;
	return dropDestination(tree, source, {
		line: line.number - 1,
		half: offsetInBlock < block.height / 2 ? 'top' : 'bottom',
		depthShift: depthShiftAt(view, item, x),
		targetFolded: isFolded(view.state, item.startLine),
	});
}
