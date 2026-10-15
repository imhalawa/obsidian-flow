import { itemAtLine } from './item-lookup';
import type { OutlineNode, OutlineTree } from './outline-tree';

export interface BulletMarker {
	startLine: number;
	from: number;
	to: number;
}

export interface Interval {
	left: number;
	right: number;
}

const BULLET = /^[-*+]$/;

/** Returns where the bullet of the item that starts on a line sits in the line, or null if it shows none. */
export function bulletMarker(tree: OutlineTree, lineIndex: number): BulletMarker | null {
	const item = tree.nodes.find((node) => node.startLine === lineIndex);
	if (!item || item.checked !== null || !BULLET.test(item.marker)) return null;
	return {
		startLine: item.startLine,
		from: item.indent.length,
		to: item.indent.length + item.marker.length,
	};
}

/** Widens an interval around its center until it is at least a minimum wide. */
export function expandToMinimumWidth(interval: Interval, minimum: number): Interval {
	const width = interval.right - interval.left;
	if (width >= minimum) return interval;
	const center = (interval.left + interval.right) / 2;
	return { left: center - minimum / 2, right: center + minimum / 2 };
}

/** Tells whether a horizontal position lies in an interval, edges included. */
export function containsX(interval: Interval, x: number): boolean {
	return interval.left <= x && x <= interval.right;
}

/** Collects the ancestors of an item, nearest first. */
function ancestorsOf(item: OutlineNode): OutlineNode[] {
	const found: OutlineNode[] = [];
	for (let parent = item.parent; parent; parent = parent.parent) found.push(parent);
	return found;
}

/** Finds the parent whose thread line is closest to a pointer on a line, within a half width; a null guide skips a parent. */
export function threadParent(
	tree: OutlineTree,
	lineIndex: number,
	x: number,
	guideX: (parent: OutlineNode) => number | null,
	halfWidth: number,
): OutlineNode | null {
	const item = itemAtLine(tree, lineIndex);
	if (!item) return null;
	let best: OutlineNode | null = null;
	let bestDistance = Infinity;
	for (const parent of ancestorsOf(item)) {
		const guide = guideX(parent);
		if (guide === null) continue;
		const distance = Math.abs(x - guide);
		if (distance <= halfWidth && distance <= bestDistance) {
			best = parent;
			bestDistance = distance;
		}
	}
	return best;
}
