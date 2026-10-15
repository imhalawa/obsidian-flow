import { describe, expect, it } from 'vitest';
import { applyEdits } from '../../src/outline/line-edit';
import { moveItemDown, moveItemUp } from '../../src/outline/move';
import { parseOutline, type OutlineNode } from '../../src/outline/outline-tree';
import { nodeDepth } from '../../src/outline/structure-guard';
import { lezerShape } from '../support/lezer-shape';
import { MARKER_SETS, SEEDS, STYLES } from '../support/property-cases';
import { randomOutline } from '../support/random-outline';

type Move = typeof moveItemUp;

/** Lists `depth:text` for the note after swapping an item subtree with an adjacent sibling. */
function expectedShape(
	lines: readonly string[],
	first: OutlineNode,
	second: OutlineNode,
): string[] {
	const nodes = parseOutline(lines, 4).nodes;
	const within = (node: OutlineNode, from: OutlineNode) =>
		node.startLine >= from.startLine && node.startLine <= from.endLine;
	return [
		...nodes.filter((node) => node.startLine < first.startLine),
		...nodes.filter((node) => within(node, second)),
		...nodes.filter((node) => within(node, first)),
		...nodes.filter((node) => node.startLine > second.endLine),
	].map((node) => `${nodeDepth(node)}:${node.text}`);
}

/** Returns the sibling that a move in the given direction swaps with, or undefined. */
function swapPartner(node: OutlineNode, roots: OutlineNode[], direction: 'up' | 'down') {
	const siblings = node.parent ? node.parent.children : roots;
	return siblings[siblings.indexOf(node) + (direction === 'down' ? 1 : -1)];
}

/** Returns a description of the first move whose result is wrong, or null. */
function firstProblem(
	move: Move,
	direction: 'up' | 'down',
	markers: string[],
	style: (typeof STYLES)[number],
) {
	for (const seed of SEEDS) {
		const lines = randomOutline(seed, markers, style.generator);
		const tree = parseOutline(lines, 4);
		for (const node of tree.nodes) {
			const result = move(lines, style.editor, node.startLine);
			const other = swapPartner(node, tree.roots, direction);
			if (!result.ok) {
				if (other) return `seed ${seed} line ${node.startLine}: refused ${result.reason}`;
				continue;
			}
			if (!other) return `seed ${seed} line ${node.startLine}: moved without a sibling`;
			const after = applyEdits(lines, result.edits);
			const [first, second] = direction === 'down' ? [node, other] : [other, node];
			if (lezerShape(after).join() !== expectedShape(lines, first, second).join()) {
				return `seed ${seed} line ${node.startLine}: shape`;
			}
			if ([...after].sort().join() !== [...lines].sort().join()) {
				return `seed ${seed} line ${node.startLine}: lines changed`;
			}
		}
	}
	return null;
}

describe.each([
	['moveItemUp', moveItemUp, 'up'],
	['moveItemDown', moveItemDown, 'down'],
] as const)('%s on generated notes', (_name, move, direction) => {
	describe.each(MARKER_SETS)('$name', ({ markers }) => {
		it.each(STYLES)('agrees with Lezer and keeps every line in $name documents', (style) => {
			expect(firstProblem(move, direction, markers, style)).toBeNull();
		});
	});
});
