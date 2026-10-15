import { foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language';
import { EditorState, Transaction, type StateEffect } from '@codemirror/state';
import { changeIn, zoomField } from './zoom-field';

interface DocRange {
	from: number;
	to: number;
}

/** Tells whether a fold would hide the position. */
function hides(range: DocRange, position: number): boolean {
	return range.from < position && position <= range.to;
}

/** Returns the effects that unfold every fold hiding a position. */
export function unfoldingHiders(state: EditorState, position: number): StateEffect<DocRange>[] {
	const effects: StateEffect<DocRange>[] = [];
	foldedRanges(state).between(0, position, (from, to) => {
		if (hides({ from, to }, position)) effects.push(unfoldEffect.of({ from, to }));
	});
	return effects;
}

export const zoomFoldGuard = EditorState.transactionFilter.of((transaction) => {
	const zoom = transaction.startState.field(zoomField);
	if (!zoom || transaction.docChanged || changeIn(transaction)) return transaction;
	const isHiding = (effect: StateEffect<unknown>): boolean =>
		effect.is(foldEffect) && hides(effect.value, zoom.from);
	if (!transaction.effects.some(isHiding)) return transaction;
	return [
		{
			effects: transaction.effects.filter((effect) => !isHiding(effect)),
			selection: transaction.selection,
			scrollIntoView: transaction.scrollIntoView,
			userEvent: transaction.annotation(Transaction.userEvent),
		},
	];
});
