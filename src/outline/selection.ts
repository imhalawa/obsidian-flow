import { itemAtLine } from './item-lookup';
import { parseOutline, type OutlineNode } from './outline-tree';

export interface LineRange {
	fromLine: number;
	toLine: number;
}

/** Tells whether a node or one of its ancestors is in the set. */
function hasSelectedAncestor(node: OutlineNode, selected: ReadonlySet<OutlineNode>): boolean {
	for (let up = node.parent; up; up = up.parent) {
		if (selected.has(up)) return true;
	}
	return false;
}

/** Returns the start lines of the outermost items touched by the line ranges, in document order. */
export function selectedItemLines(
	lines: readonly string[],
	tabSize: number,
	ranges: readonly LineRange[],
): number[] {
	const tree = parseOutline(lines, tabSize);
	const selected = new Set<OutlineNode>();
	for (const range of ranges) {
		const owner = itemAtLine(tree, range.fromLine);
		if (owner) selected.add(owner);
		for (const node of tree.nodes) {
			if (node.startLine >= range.fromLine && node.startLine <= range.toLine)
				selected.add(node);
		}
	}
	return tree.nodes
		.filter((node) => selected.has(node) && !hasSelectedAncestor(node, selected))
		.map((node) => node.startLine);
}
