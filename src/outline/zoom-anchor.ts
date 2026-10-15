import { itemStartingAt } from './item-lookup';
import type { OutlineNode, OutlineTree } from './outline-tree';

export interface AnchorSegment {
	text: string;
	nth: number;
}

export type Anchor = readonly AnchorSegment[];

const TRAILING_BLOCK_ID = /\s\^[A-Za-z0-9-]+$/;

/** Returns the text of an item without its block id, the way anchors compare it. */
function anchorText(node: OutlineNode): string {
	return node.text.replace(TRAILING_BLOCK_ID, '').trim();
}

/** Returns the items that share a parent with a node, the node included. */
function siblingsOf(tree: OutlineTree, node: OutlineNode): readonly OutlineNode[] {
	return node.parent ? node.parent.children : tree.roots;
}

/** Returns the path from the top level item down to a node. */
function pathTo(node: OutlineNode): OutlineNode[] {
	const path: OutlineNode[] = [];
	for (let up: OutlineNode | null = node; up; up = up.parent) path.unshift(up);
	return path;
}

/** Describes an item by the texts on its path and its position among equal siblings. */
export function makeAnchor(tree: OutlineTree, startLine: number): Anchor | null {
	const item = itemStartingAt(tree, startLine);
	if (!item) return null;
	return pathTo(item).map((node) => {
		const text = anchorText(node);
		const equal = siblingsOf(tree, node).filter((sibling) => anchorText(sibling) === text);
		return { text, nth: equal.indexOf(node) };
	});
}

/** Returns the start line of the deepest item an anchor still matches, or null when none matches. */
export function resolveAnchor(tree: OutlineTree, anchor: Anchor): number | null {
	let siblings: readonly OutlineNode[] = tree.roots;
	let found: OutlineNode | null = null;
	for (const segment of anchor) {
		const equal = siblings.filter((sibling) => anchorText(sibling) === segment.text);
		const pick = equal[Math.min(segment.nth, equal.length - 1)];
		if (!pick) break;
		found = pick;
		siblings = pick.children;
	}
	return found ? found.startLine : null;
}
