import type { EditorState, Extension, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { changeIn, zoomField } from './zoom-field';

/** Tells whether edits removed the zoomed item, as opposed to the user leaving the zoom. */
export function zoomWasRemoved(
	before: EditorState,
	after: EditorState,
	transactions: readonly Transaction[],
): boolean {
	const asked = transactions.some((transaction) => changeIn(transaction) !== null);
	const zoomBefore = before.field(zoomField, false);
	const zoomAfter = after.field(zoomField, false);
	if (zoomBefore === undefined || zoomAfter === undefined) return false;
	return !asked && zoomBefore !== null && zoomAfter === null;
}

/** Calls back once whenever edits remove the item a view is zoomed into. */
export function zoomRemovedNotifier(onRemoved: () => void): Extension {
	return EditorView.updateListener.of((update) => {
		if (zoomWasRemoved(update.startState, update.state, update.transactions)) onRemoved();
	});
}
