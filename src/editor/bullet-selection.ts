import {
	EditorSelection,
	EditorState,
	type Extension,
	type SelectionRange,
} from '@codemirror/state';
import { itemStartingAt } from '../outline/item-lookup';
import { isEmbedItem } from '../outline/embed-item';
import { clampToItemText } from '../outline/text-clamp';
import { outlineOfState } from './outline-of-state';

/** Returns a document position moved out of the indent and marker of the list item whose first line holds it. */
function textPosition(state: EditorState, position: number): number {
	const line = state.doc.lineAt(position);
	if (isEmbedItem(line.text)) return position;
	const item = itemStartingAt(outlineOfState(state), line.number - 1);
	return line.from + clampToItemText(line.text, item, position - line.from);
}

/** Returns the extension that keeps every cursor and selection end out of the bullet of a list item, so a selection holds text only. */
export function keepBulletsOutOfSelection(isEnabled: () => boolean): Extension {
	return EditorState.transactionFilter.of((transaction) => {
		const selection = transaction.selection;
		if (!isEnabled() || !selection || transaction.docChanged) return transaction;
		const state = transaction.startState;
		const wholeNote = (range: SelectionRange) =>
			range.from === 0 && range.to === state.doc.length;
		const ranges = selection.ranges.map((range) =>
			wholeNote(range)
				? range
				: EditorSelection.range(
						textPosition(state, range.anchor),
						textPosition(state, range.head),
					),
		);
		const moved = ranges.some(
			(range, index) =>
				range.anchor !== selection.ranges[index]?.anchor ||
				range.head !== selection.ranges[index]?.head,
		);
		if (!moved) return transaction;
		return [transaction, { selection: EditorSelection.create(ranges, selection.mainIndex) }];
	});
}
