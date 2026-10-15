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
	return !asked && before.field(zoomField) !== null && after.field(zoomField) === null;
}

/** Calls back once whenever edits remove the item a view is zoomed into. */
export function zoomRemovedNotifier(onRemoved: () => void): Extension {
	return EditorView.updateListener.of((update) => {
		if (zoomWasRemoved(update.startState, update.state, update.transactions)) onRemoved();
	});
}
