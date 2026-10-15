import { StateEffect, StateField, type EditorState, type Transaction } from '@codemirror/state';
import type { Breadcrumb } from '../outline/zoom';
import { resolveZoom } from '../outline/zoom-view';

export type ZoomNavigation = 'visit' | 'back' | 'forward';

export interface ZoomChange {
	startLine: number | null;
	navigation: ZoomNavigation;
}

export interface ZoomState {
	from: number;
	to: number;
	crumbs: Breadcrumb[];
}

export const zoomChange = StateEffect.define<ZoomChange>();

/** Returns the zoom change a transaction carries, or null. */
export function changeIn(transaction: Transaction): ZoomChange | null {
	const effects = transaction.effects.filter((effect) => effect.is(zoomChange));
	const last = effects[effects.length - 1];
	return last ? last.value : null;
}

/** Zooms into the item that starts on a line, with the visible range as document offsets. */
export function zoomOnLine(state: EditorState, startLine: number): ZoomState | null {
	const view = resolveZoom(state.doc.toJSON(), state.tabSize, startLine);
	if (!view) return null;
	return {
		from: state.doc.line(view.range.fromLine + 1).from,
		to: state.doc.line(view.range.toLine + 1).to,
		crumbs: view.crumbs,
	};
}

/** Follows the zoomed item through edits and keeps text added at its end inside the zoom. */
function followEdits(zoom: ZoomState, transaction: Transaction): ZoomState | null {
	const state = transaction.state;
	const mappedFrom = transaction.changes.mapPos(zoom.from, 1);
	const refreshed = zoomOnLine(state, state.doc.lineAt(mappedFrom).number - 1);
	if (!refreshed) return null;
	const mappedTo = transaction.changes.mapPos(zoom.to, 1);
	return { ...refreshed, to: Math.max(refreshed.to, mappedTo) };
}

export const zoomField = StateField.define<ZoomState | null>({
	create: () => null,
	update(value, transaction) {
		const change = changeIn(transaction);
		if (change) {
			return change.startLine === null
				? null
				: zoomOnLine(transaction.state, change.startLine);
		}
		if (!value || !transaction.docChanged) return value;
		return followEdits(value, transaction);
	},
});
