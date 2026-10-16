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

interface Candidate {
	destination: DropDestination;
	offset: number;
}

interface Placements {
	preferred: Candidate;
	others: Candidate[];
}

/** Tells whether an item is the last child of its parent. */
function isLastChild(item: OutlineNode): boolean {
	const parent = item.parent;
	return parent !== null && parent.children[parent.children.length - 1] === item;
}

/** Lists the places below a hovered item, each with how many levels deeper than the item it is. */
function placementsBelow(target: OutlineNode, folded: boolean): Placements {
	const firstChild: Candidate = {
		destination: { kind: 'first-child', targetLine: target.startLine },
		offset: 1,
	};
	if (target.children.length > 0 && !folded) return { preferred: firstChild, others: [] };
	const sibling: Candidate = {
		destination: { kind: 'after', targetLine: target.startLine },
		offset: 0,
	};
	const others = [firstChild];
	let up = target;
	let offset = 0;
	while (up.parent && isLastChild(up)) {
		offset -= 1;
		up = up.parent;
		others.push({ destination: { kind: 'after', targetLine: up.startLine }, offset });
	}
	return { preferred: sibling, others };
}

/** Picks the place whose depth offset is closest to the preferred offset moved by the shift. */
function choose(placements: Placements, shift: number): Candidate {
	const wanted = placements.preferred.offset + shift;
	return placements.others.reduce(
		(best, candidate) =>
			Math.abs(candidate.offset - wanted) < Math.abs(best.offset - wanted) ? candidate : best,
		placements.preferred,
	);
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
	return choose(placementsBelow(target, hover.targetFolded), hover.depthShift).destination;
}
