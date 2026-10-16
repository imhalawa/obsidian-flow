import { unfoldEffect } from '@codemirror/language';
import { StateEffect, StateField, type EditorState, type Transaction } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';

export const REVEALED_LINE_CLASS = 'flow-line-revealed';

export const clearReveal = StateEffect.define<null>();

const revealedLine = Decoration.line({ class: REVEALED_LINE_CLASS });

/** Returns the start of every line that the unfolds of a transaction show again. */
function revealedLineStarts(transaction: Transaction, state: EditorState): number[] {
	const starts: number[] = [];
	for (const effect of transaction.effects) {
		if (!effect.is(unfoldEffect)) continue;
		const first = state.doc.lineAt(effect.value.from).number + 1;
		const last = state.doc.lineAt(effect.value.to).number;
		for (let number = first; number <= last; number += 1)
			starts.push(state.doc.line(number).from);
	}
	return starts;
}

export const revealField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(value, transaction) {
		if (transaction.effects.some((effect) => effect.is(clearReveal))) return Decoration.none;
		return value.map(transaction.changes).update({
			add: revealedLineStarts(transaction, transaction.state).map((start) =>
				revealedLine.range(start),
			),
			sort: true,
		});
	},
	provide: (field) => EditorView.decorations.from(field),
});
