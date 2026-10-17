import { StateEffect, StateField, type EditorState, type Transaction } from '@codemirror/state';
import type { Breadcrumb } from '../outline/zoom';
import { makeAnchor, resolveExactAnchor } from '../outline/zoom-anchor';
import { resolveZoom } from '../outline/zoom-view';
import { outlineOfState } from './outline-of-state';

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
	const view = resolveZoom(state.doc.toJSON(), outlineOfState(state), startLine);
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

/** Tells whether a change removes the start of the zoomed range, so offsets cannot be followed through it. */
function crossesZoomStart(zoom: ZoomState, transaction: Transaction): boolean {
	let crossed = false;
	transaction.changes.iterChangedRanges((fromA, toA) => {
		if (fromA <= zoom.from && toA > zoom.from) crossed = true;
	});
	return crossed;
}

/** Finds the zoomed item again by its text path after the note was replaced, or leaves the zoom when it is gone. */
function refindZoom(zoom: ZoomState, transaction: Transaction): ZoomState | null {
	const before = transaction.startState;
	const anchor = makeAnchor(
		before.doc.toJSON(),
		before.tabSize,
		before.doc.lineAt(zoom.from).number - 1,
	);
	if (!anchor) return null;
	const after = transaction.state;
	const line = resolveExactAnchor(after.doc.toJSON(), after.tabSize, anchor);
	return line === null ? null : zoomOnLine(after, line);
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
		return crossesZoomStart(value, transaction)
			? refindZoom(value, transaction)
			: followEdits(value, transaction);
	},
});
