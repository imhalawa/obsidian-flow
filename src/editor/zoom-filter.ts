import { EditorState, Transaction } from '@codemirror/state';
import { changeIn, zoomField, type ZoomState } from './zoom-field';

/** Tells whether a transaction was caused by the user in this view rather than by sync. */
function isLocalUserEdit(transaction: Transaction): boolean {
	return (
		transaction.annotation(Transaction.userEvent) !== undefined &&
		transaction.annotation(Transaction.remote) !== true
	);
}

/** Tells whether any change of a transaction reaches outside the zoomed range. */
function touchesOutside(transaction: Transaction, zoom: ZoomState): boolean {
	let outside = false;
	transaction.changes.iterChangedRanges((fromA, toA) => {
		if (fromA < zoom.from || toA > zoom.to) outside = true;
	});
	return outside;
}

export const zoomEditFilter = EditorState.transactionFilter.of((transaction) => {
	const zoom = transaction.startState.field(zoomField);
	if (!zoom || !transaction.docChanged || !isLocalUserEdit(transaction)) return transaction;
	if (changeIn(transaction)) return transaction;
	return touchesOutside(transaction, zoom) ? [] : transaction;
});
