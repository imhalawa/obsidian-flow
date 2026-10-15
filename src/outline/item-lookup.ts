import type { OutlineNode, OutlineTree } from './outline-tree';

/** Returns the deepest item whose lines include the given line, or null. */
export function itemAtLine(tree: OutlineTree, lineIndex: number): OutlineNode | null {
	let found: OutlineNode | null = null;
	for (const node of tree.nodes) {
		if (node.startLine <= lineIndex && lineIndex <= node.endLine) found = node;
	}
	return found;
}
