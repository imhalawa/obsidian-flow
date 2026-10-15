import {
	allBlockIds,
	duplicateBlockIds,
	idInsertion,
	newBlockId,
	readBlockId,
} from '../outline/block-id';
import { itemAtLine } from '../outline/item-lookup';
import { parseOutline } from '../outline/outline-tree';
import type { ZoomTarget } from './zoom-control';

export type BlockLinkOutcome =
	{ kind: 'item'; id: string; added: boolean; duplicate: boolean } | { kind: 'not-a-list-item' };

/** Gives the item at the cursor a block id if it has none, and returns the id. */
export function ensureBlockId(target: ZoomTarget, random: () => number): BlockLinkOutcome {
	const state = target.state;
	const lines = state.doc.toJSON();
	const cursorLine = state.doc.lineAt(state.selection.main.head).number - 1;
	const item = itemAtLine(parseOutline(lines, state.tabSize), cursorLine);
	if (!item) return { kind: 'not-a-list-item' };
	const existing = readBlockId(lines, item);
	if (existing !== null) {
		return {
			kind: 'item',
			id: existing,
			added: false,
			duplicate: duplicateBlockIds(lines).includes(existing),
		};
	}
	const id = newBlockId(new Set(allBlockIds(lines)), random);
	const insertion = idInsertion(lines, item, id);
	const lineStart = state.doc.line(insertion.lineIndex + 1).from;
	target.dispatch({
		changes: {
			from: lineStart + insertion.from,
			to: lineStart + insertion.to,
			insert: insertion.insert,
		},
		userEvent: 'flow.block-id',
	});
	return { kind: 'item', id, added: true, duplicate: false };
}
