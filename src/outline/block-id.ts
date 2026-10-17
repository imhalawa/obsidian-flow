import { lineAt } from './line-edit';
import type { OutlineNode, OutlineTree } from './outline-tree';

export interface IdInsertion {
	lineIndex: number;
	from: number;
	to: number;
	insert: string;
}

export interface IdSpan {
	lineIndex: number;
	from: number;
	to: number;
}

const TRAILING_ID = /\s\^([A-Za-z0-9-]+)$/;
const FENCE_START = /^\s*(`{3,}|~{3,})/;
const ID_LENGTH = 6;
const BASE = 36;

/** Returns the last line of the item's own first paragraph, where Obsidian reads its block id. */
export function idLineOf(lines: readonly string[], item: OutlineNode): number {
	const firstChild = item.children[0];
	const limit = firstChild ? firstChild.startLine - 1 : item.endLine;
	let last = item.startLine;
	for (let line = item.startLine + 1; line <= limit; line += 1) {
		const text = lineAt(lines, line);
		if (text.trim() === '' || FENCE_START.test(text)) break;
		last = line;
	}
	return last;
}

/** Returns the block id at the end of an item, or null when it has none. */
export function readBlockId(lines: readonly string[], item: OutlineNode): string | null {
	return TRAILING_ID.exec(lineAt(lines, idLineOf(lines, item)))?.[1] ?? null;
}

/** Returns the text without a trailing block id. */
export function stripBlockId(text: string): string {
	return text.replace(TRAILING_ID, '');
}

/** Returns every block id at the end of a line, in order and with repeats. */
export function allBlockIds(lines: readonly string[]): string[] {
	return lines.flatMap((line) => TRAILING_ID.exec(line)?.[1] ?? []);
}

/** Returns the block ids that end more than one line of the note. */
export function duplicateBlockIds(lines: readonly string[]): string[] {
	const seen = new Set<string>();
	const repeated = new Set<string>();
	for (const id of allBlockIds(lines)) {
		if (seen.has(id)) repeated.add(id);
		seen.add(id);
	}
	return [...repeated];
}

/** Makes a base-36 id that is not taken, from a source of random numbers in [0, 1). */
export function newBlockId(taken: ReadonlySet<string>, random: () => number): string {
	for (;;) {
		const id = Math.floor(random() * BASE ** ID_LENGTH)
			.toString(BASE)
			.padStart(ID_LENGTH, '0');
		if (!taken.has(id)) return id;
	}
}

/** Returns the change that appends a block id to the line where an item's id belongs. */
export function idInsertion(lines: readonly string[], item: OutlineNode, id: string): IdInsertion {
	const lineIndex = idLineOf(lines, item);
	const text = lineAt(lines, lineIndex);
	return { lineIndex, from: text.trimEnd().length, to: text.length, insert: ` ^${id}` };
}

/** Returns where the trailing block id of every list item sits, including the space before it. */
export function blockIdSpans(lines: readonly string[], tree: OutlineTree): IdSpan[] {
	return tree.nodes.flatMap((item) => {
		const lineIndex = idLineOf(lines, item);
		const text = lineAt(lines, lineIndex);
		const match = TRAILING_ID.exec(text);
		return match ? [{ lineIndex, from: match.index, to: text.length }] : [];
	});
}
