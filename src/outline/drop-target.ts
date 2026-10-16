import { itemAtLine } from './item-lookup';
import type { DropDestination } from './move-subtree';
import type { OutlineNode, OutlineTree } from './outline-tree';

export interface LineSpan {
	startLine: number;
	endLine: number;
}

export interface DropHover {
	line: number;
	half: 'top' | 'bottom';
	depthShift: number;
	targetFolded: boolean;
}

/** Returns how many parents an item is the last child of, one after the other. */
function levelsEnded(item: OutlineNode): number {
	let levels = 0;
	for (let up = item; up.parent?.children[up.parent.children.length - 1] === up; up = up.parent) {
		levels += 1;
	}
	return levels;
}

/** Returns the ancestor a number of levels above an item. */
function ancestorAbove(item: OutlineNode, levels: number): OutlineNode {
	let up = item;
	for (let step = 0; step < levels && up.parent; step += 1) up = up.parent;
	return up;
}

/** Returns the place below a hovered item; the shift moves it one level deeper (positive) or shallower (negative). */
function placeBelow(target: OutlineNode, folded: boolean, shift: number): DropDestination {
	const firstChild: DropDestination = { kind: 'first-child', targetLine: target.startLine };
	if (target.children.length > 0 && !folded) return firstChild;
	const level = Math.min(Math.max(shift, -levelsEnded(target)), 1);
	if (level === 1) return firstChild;
	return { kind: 'after', targetLine: ancestorAbove(target, -level).startLine };
}

/** Decides where a dragged item would land for a pointer over a line, or null when it cannot land there. */
export function dropDestination(
	tree: OutlineTree,
	source: LineSpan | null,
	hover: DropHover,
): DropDestination | null {
	const target = itemAtLine(tree, hover.line);
	if (!target) return null;
	if (source && target.startLine >= source.startLine && target.startLine <= source.endLine) {
		return null;
	}
	if (hover.half === 'top') return { kind: 'before', targetLine: target.startLine };
	return placeBelow(target, hover.targetFolded, hover.depthShift);
}
