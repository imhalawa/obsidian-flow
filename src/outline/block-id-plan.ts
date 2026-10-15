import { allBlockIds, idInsertion, newBlockId, readBlockId, type IdInsertion } from './block-id';
import { itemStartingAt } from './item-lookup';
import { parseOutline } from './outline-tree';

export interface BlockIdPlan {
	id: string;
	insertion: IdInsertion | null;
}

export interface TextWithBlockId {
	text: string;
	id: string;
}

/** Returns the id of the item that starts on a line and the insertion it needs, or null if no item starts there. */
export function planBlockId(
	lines: readonly string[],
	tabSize: number,
	startLine: number,
	random: () => number,
): BlockIdPlan | null {
	const item = itemStartingAt(parseOutline(lines, tabSize), startLine);
	if (!item) return null;
	const existing = readBlockId(lines, item);
	if (existing !== null) return { id: existing, insertion: null };
	const id = newBlockId(new Set(allBlockIds(lines)), random);
	return { id, insertion: idInsertion(lines, item, id) };
}

/** Returns the note text with a block id on the item that starts on a line, or null if no item starts there. */
export function withBlockId(
	text: string,
	tabSize: number,
	startLine: number,
	random: () => number,
): TextWithBlockId | null {
	const lineBreak = text.includes('\r\n') ? '\r\n' : '\n';
	const lines = text.split(lineBreak);
	const plan = planBlockId(lines, tabSize, startLine, random);
	if (!plan) return null;
	const insertion = plan.insertion;
	if (!insertion) return { text, id: plan.id };
	const line = lines[insertion.lineIndex] ?? '';
	lines[insertion.lineIndex] =
		line.slice(0, insertion.from) + insertion.insert + line.slice(insertion.to);
	return { text: lines.join(lineBreak), id: plan.id };
}
