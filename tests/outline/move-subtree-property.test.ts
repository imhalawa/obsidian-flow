import { describe, expect, it } from 'vitest';
import { moveSubtree, type DropKind } from '../../src/outline/move-subtree';
import { parseOutline, type OutlineNode } from '../../src/outline/outline-tree';
import { nodeDepth } from '../../src/outline/structure-guard';
import { lezerShape } from '../support/lezer-shape';
import { MARKER_SETS, SEEDS, STYLES } from '../support/property-cases';
import { randomOutline } from '../support/random-outline';

const KINDS: DropKind[] = ['before', 'after', 'first-child'];

/** Lists `depth:text` for the note after the subtree of `source` is moved next to or into `target`. */
function expectedShape(
	lines: readonly string[],
	source: OutlineNode,
	target: OutlineNode,
	kind: DropKind,
) {
	const nodes = parseOutline(lines, 4).nodes;
	const inBlock = (node: OutlineNode) =>
		node.startLine >= source.startLine && node.startLine <= source.endLine;
	const rest = nodes.filter((node) => !inBlock(node));
	const block = nodes.filter(inBlock);
	const before = rest.filter((node) => {
		if (kind === 'before') return node.startLine < target.startLine;
		if (kind === 'after') return node.startLine <= target.endLine;
		return node.startLine <= target.startLine;
	});
	const rootDepth = nodeDepth(target) + (kind === 'first-child' ? 1 : 0);
	const describeNode = (node: OutlineNode, depth: number) => `${depth}:${node.text}`;
	return [
		...before.map((node) => describeNode(node, nodeDepth(node))),
		...block.map((node) => describeNode(node, nodeDepth(node) - nodeDepth(source) + rootDepth)),
		...rest.slice(before.length).map((node) => describeNode(node, nodeDepth(node))),
	];
}

/** Returns a description of the first move whose result is wrong, or null. */
function firstProblem(markers: string[], style: (typeof STYLES)[number]) {
	for (const seed of SEEDS) {
		const lines = randomOutline(seed, markers, style.generator);
		const nodes = parseOutline(lines, 4).nodes;
		for (const source of nodes) {
			for (const target of nodes) {
				for (const kind of KINDS) {
					const where = `seed ${seed} ${source.startLine}->${kind} ${target.startLine}`;
					const result = moveSubtree(lines, style.editor, source.startLine, {
						kind,
						targetLine: target.startLine,
					});
					const inside =
						target.startLine >= source.startLine && target.startLine <= source.endLine;
					if (inside) {
						if (result.ok || result.reason !== 'drop-into-self')
							return `${where}: not refused`;
						continue;
					}
					if (!result.ok) return `${where}: refused ${result.reason}`;
					if (result.lines.length !== lines.length) return `${where}: line count`;
					const expected = expectedShape(lines, source, target, kind).join();
					if (lezerShape(result.lines).join() !== expected) return `${where}: shape`;
				}
			}
		}
	}
	return null;
}

describe('moveSubtree on generated notes', () => {
	describe.each(MARKER_SETS)('$name', ({ markers }) => {
		it.each(STYLES)('agrees with Lezer in $name documents', (style) => {
			expect(firstProblem(markers, style)).toBeNull();
		});
	});
});
