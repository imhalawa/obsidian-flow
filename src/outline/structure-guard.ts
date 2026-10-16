import { applyEdits, refuse, type EditResult, type LineEdit, type LineMove } from './line-edit';
import type { IndentStyle } from './indent-style';
import { parseOutline, type OutlineNode, type OutlineTree } from './outline-tree';

/** Returns how many ancestors an item has. */
export function nodeDepth(node: OutlineNode): number {
	let depth = 0;
	for (let up = node.parent; up; up = up.parent) depth += 1;
	return depth;
}

/** Lists the depth of every item in document order. */
export function depthsOf(tree: OutlineTree): number[] {
	return tree.nodes.map(nodeDepth);
}

/** Tells whether two lists of depths are the same. */
export function sameDepths(first: readonly number[], second: readonly number[]): boolean {
	return first.length === second.length && first.every((depth, index) => depth === second[index]);
}

/** Accepts the edits only when re-parsing the result gives the expected depths. */
export function guardedEdits(
	lines: readonly string[],
	style: IndentStyle,
	edits: LineEdit[],
	expectedDepths: readonly number[],
	lineMoves: LineMove[],
): EditResult {
	const after = depthsOf(parseOutline(applyEdits(lines, edits), style.tabSize));
	return sameDepths(after, expectedDepths)
		? { ok: true, edits, lineMoves }
		: refuse('structure-check-failed');
}
