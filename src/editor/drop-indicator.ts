import { StateEffect, StateField, type EditorState, type Extension } from '@codemirror/state';
import { layer, RectangleMarker, type EditorView } from '@codemirror/view';
import { itemStartingAt } from '../outline/item-lookup';
import { ownLastLine } from '../outline/item-text';
import { subtreeLastLine, type DropDestination } from '../outline/move-subtree';
import { levelWidth, markerLeft } from './item-geometry';
import { outlineOfState } from './outline-of-state';

const INDICATOR_HEIGHT = 2;

export const setDropIndicator = StateEffect.define<DropDestination | null>();

export const dropIndicatorField = StateField.define<DropDestination | null>({
	create: () => null,
	update(value, transaction) {
		if (transaction.docChanged) return null;
		let next = value;
		for (const effect of transaction.effects)
			if (effect.is(setDropIndicator)) next = effect.value;
		return next;
	},
});

/** Returns where the dragged item would land, or null when nothing is dragged or the plugin is not active in the editor. */
export function indicatedDestination(state: EditorState): DropDestination | null {
	return state.field(dropIndicatorField, false) ?? null;
}

/** Returns the screen height where the indicator line for a destination sits, or null when it is not drawn. */
function indicatorTop(view: EditorView, destination: DropDestination): number | null {
	const state = view.state;
	const lines = state.doc.toJSON();
	const item = itemStartingAt(outlineOfState(state), destination.targetLine);
	if (!item) return null;
	if (destination.kind === 'before') {
		return view.coordsAtPos(state.doc.line(item.startLine + 1).from)?.top ?? null;
	}
	const last =
		destination.kind === 'after' ? subtreeLastLine(lines, item) : ownLastLine(lines, item);
	return view.coordsAtPos(state.doc.line(last + 1).to)?.bottom ?? null;
}

/** Draws the line that shows where a dragged item would land. */
function indicatorMarkers(view: EditorView): RectangleMarker[] {
	const destination = indicatedDestination(view.state);
	if (!destination) return [];
	const item = itemStartingAt(outlineOfState(view.state), destination.targetLine);
	const top = indicatorTop(view, destination);
	const left = item ? markerLeft(view, item) : null;
	if (!item || top === null || left === null) return [];
	const origin = view.scrollDOM.getBoundingClientRect();
	const indent = destination.kind === 'first-child' ? levelWidth(view, item) : 0;
	const x = left + indent - origin.left + view.scrollDOM.scrollLeft;
	const y = top - origin.top + view.scrollDOM.scrollTop - INDICATOR_HEIGHT / 2;
	const right =
		view.contentDOM.getBoundingClientRect().right - origin.left + view.scrollDOM.scrollLeft;
	return [new RectangleMarker('flow-drop-indicator', x, y, right - x, INDICATOR_HEIGHT)];
}

/** Returns the extension that draws the drop indicator of the item being dragged. */
export function dropIndicator(): Extension {
	return [
		dropIndicatorField,
		layer({
			above: true,
			class: 'flow-drop-layer',
			markers: indicatorMarkers,
			update: (update) =>
				update.docChanged ||
				update.viewportChanged ||
				update.geometryChanged ||
				update.transactions.some((transaction) =>
					transaction.effects.some((effect) => effect.is(setDropIndicator)),
				),
		}),
	];
}
