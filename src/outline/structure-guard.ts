import { applyEdits, refuse, type EditResult, type LineEdit } from './line-edit';
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

/** Accepts the edits only when re-parsing the result gives the expected depths. */
export function guardedEdits(
	lines: readonly string[],
	style: IndentStyle,
	edits: LineEdit[],
	expectedDepths: readonly number[],
): EditResult {
	const after = depthsOf(parseOutline(applyEdits(lines, edits), style.tabSize));
	const same =
		after.length === expectedDepths.length && after.every((d, i) => d === expectedDepths[i]);
	return same ? { ok: true, edits } : refuse('structure-check-failed');
}
