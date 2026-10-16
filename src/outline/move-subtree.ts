import { childIndentColumns } from './indent';
import { shiftIndent, type IndentStyle } from './indent-style';
import { itemStartingAt } from './item-lookup';
import { ownLastLine } from './item-text';
import { lineAt, refuse, type Refusal } from './line-edit';
import { parseListItem, visualWidth } from './list-item';
import { parseOutline, type OutlineNode } from './outline-tree';
import { depthsOf, nodeDepth } from './structure-guard';

export type DropKind = 'before' | 'after' | 'first-child';

export interface DropDestination {
	kind: DropKind;
	targetLine: number;
}

export type TakeResult = { ok: true; block: string[]; remaining: string[] } | Refusal;

export type PlaceResult =
	{ ok: true; lines: string[]; blockStart: number; blockLength: number } | Refusal;

const ORDERED_NUMBER = /^(\s*)\d+/;

/** Returns the last line of an item and its descendants, leaving out blank lines after them. */
export function subtreeLastLine(lines: readonly string[], item: OutlineNode): number {
	let last = item.endLine;
	while (last > item.startLine && lineAt(lines, last).trim() === '') last -= 1;
	return last;
}

/** Tells whether two lists of depths are the same. */
function sameDepths(first: readonly number[], second: readonly number[]): boolean {
	return first.length === second.length && first.every((depth, index) => depth === second[index]);
}

/** Cuts an item and its subtree out of the note. */
export function takeSubtree(
	lines: readonly string[],
	style: IndentStyle,
	sourceLine: number,
): TakeResult {
	const tree = parseOutline(lines, style.tabSize);
	const item = itemStartingAt(tree, sourceLine);
	if (!item) return refuse('not-a-list-item');
	const last = subtreeLastLine(lines, item);
	const remaining = [...lines.slice(0, item.startLine), ...lines.slice(last + 1)];
	const expected = tree.nodes
		.filter((node) => node.startLine < item.startLine || node.startLine > last)
		.map(nodeDepth);
	if (!sameDepths(depthsOf(parseOutline(remaining, style.tabSize)), expected)) {
		return refuse('structure-check-failed');
	}
	return { ok: true, block: lines.slice(item.startLine, last + 1), remaining };
}

/** Returns the line where a block is inserted for a destination. */
function insertionLine(lines: readonly string[], target: OutlineNode, kind: DropKind): number {
	if (kind === 'before') return target.startLine;
	if (kind === 'after') return subtreeLastLine(lines, target) + 1;
	return ownLastLine(lines, target) + 1;
}

/** Returns the block moved to a new indent and, for the first child of a childless item, numbered from one. */
function placedBlock(
	block: readonly string[],
	style: IndentStyle,
	delta: number,
	renumber: boolean,
): string[] {
	const shifted = block.map((line) => shiftIndent(line, delta, style));
	const first = shifted[0] ?? '';
	if (!renumber) return shifted;
	return [
		first.replace(ORDERED_NUMBER, (_match, indent: string) => `${indent}1`),
		...shifted.slice(1),
	];
}

/** Puts a block of an item and its subtree next to or inside a target item. */
export function placeSubtree(
	lines: readonly string[],
	style: IndentStyle,
	block: readonly string[],
	destination: DropDestination,
): PlaceResult {
	const tree = parseOutline(lines, style.tabSize);
	const target = itemStartingAt(tree, destination.targetLine);
	const head = parseListItem(block[0] ?? '');
	if (!head) return refuse('not-a-list-item');
	const flat = block.map((line) =>
		shiftIndent(line, -visualWidth(head.indent, style.tabSize), style),
	);
	const blockTree = parseOutline(flat, style.tabSize);
	if (!target || blockTree.roots.length !== 1) return refuse('not-a-list-item');
	const child = destination.kind === 'first-child';
	const rootDepth = nodeDepth(target) + (child ? 1 : 0);
	const indent = child ? childIndentColumns(target, style) : target.indentColumns;
	const at = insertionLine(lines, target, destination.kind);
	const placed = placedBlock(flat, style, indent, child && target.children.length === 0);
	const result = [...lines.slice(0, at), ...placed, ...lines.slice(at)];
	const before = tree.nodes.filter((node) => node.startLine < at);
	const expected = [
		...before.map(nodeDepth),
		...blockTree.nodes.map((node) => nodeDepth(node) + rootDepth),
		...tree.nodes.slice(before.length).map(nodeDepth),
	];
	if (!sameDepths(depthsOf(parseOutline(result, style.tabSize)), expected)) {
		return refuse('structure-check-failed');
	}
	return { ok: true, lines: result, blockStart: at, blockLength: placed.length };
}

/** Moves an item and its subtree to a destination in the same note. */
export function moveSubtree(
	lines: readonly string[],
	style: IndentStyle,
	sourceLine: number,
	destination: DropDestination,
): PlaceResult {
	const taken = takeSubtree(lines, style, sourceLine);
	if (!taken.ok) return taken;
	const last = sourceLine + taken.block.length - 1;
	if (destination.targetLine >= sourceLine && destination.targetLine <= last) {
		return refuse('drop-into-self');
	}
	const shift = destination.targetLine > last ? taken.block.length : 0;
	return placeSubtree(taken.remaining, style, taken.block, {
		kind: destination.kind,
		targetLine: destination.targetLine - shift,
	});
}
