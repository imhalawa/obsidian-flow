import { EditorState, Transaction, type Extension } from '@codemirror/state';
import { viewFocus, viewFocusField } from './view-focus';
import { changeIn, zoomField, type ZoomState } from './zoom-field';

/** Tells whether a transaction was caused by the user typing in this view, which has focus, rather than by sync or by an edit another pane forwarded. */
function isLocalUserEdit(transaction: Transaction): boolean {
	const focused = transaction.startState.field(viewFocusField);
	return (
		transaction.annotation(Transaction.userEvent) !== undefined &&
		transaction.annotation(Transaction.remote) !== true &&
		focused
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

export const zoomEditFilter: Extension = [
	viewFocus(),
	EditorState.transactionFilter.of((transaction) => {
		const zoom = transaction.startState.field(zoomField);
		if (!zoom || !transaction.docChanged || !isLocalUserEdit(transaction)) return transaction;
		if (changeIn(transaction)) return transaction;
		return touchesOutside(transaction, zoom) ? [] : transaction;
	}),
];
