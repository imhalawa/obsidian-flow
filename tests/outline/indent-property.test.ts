import { describe, expect, it } from 'vitest';
import { indentItem, outdentItem } from '../../src/outline/indent';
import type { IndentStyle } from '../../src/outline/indent-style';
import { applyEdits, type EditResult } from '../../src/outline/line-edit';
import { parseOutline } from '../../src/outline/outline-tree';
import { nodeDepth } from '../../src/outline/structure-guard';
import { lezerShape } from '../support/lezer-shape';
import { MARKER_SETS, SEEDS, STYLES } from '../support/property-cases';
import { randomOutline } from '../support/random-outline';

type Operation = (lines: readonly string[], style: IndentStyle, lineIndex: number) => EditResult;

/** Lists `depth:text` for the note after shifting an item subtree by `change` levels. */
function expectedShape(lines: readonly string[], lineIndex: number, change: number): string[] {
	const nodes = parseOutline(lines, 4).nodes;
	const target = nodes.find((node) => node.startLine === lineIndex);
	return nodes.map((node) => {
		const inside =
			target && node.startLine >= target.startLine && node.startLine <= target.endLine;
		return `${nodeDepth(node) + (inside ? change : 0)}:${node.text}`;
	});
}

/** Returns a description of the first operation whose result is wrong, or null. */
function firstProblem(
	operation: Operation,
	change: number,
	markers: string[],
	style: (typeof STYLES)[number],
) {
	for (const seed of SEEDS) {
		const lines = randomOutline(seed, markers, style.generator);
		for (const node of parseOutline(lines, 4).nodes) {
			const result = operation(lines, style.editor, node.startLine);
			if (!result.ok) {
				if (result.reason === 'structure-check-failed')
					return `seed ${seed} line ${node.startLine}: guard refused`;
				continue;
			}
			const after = applyEdits(lines, result.edits);
			const expected = expectedShape(lines, node.startLine, change).join();
			if (lezerShape(after).join() !== expected)
				return `seed ${seed} line ${node.startLine}: shape`;
			const stripped = (list: readonly string[]) => list.map((line) => line.trimStart());
			if (stripped(after).join() !== stripped(lines).join())
				return `seed ${seed} line ${node.startLine}: text`;
		}
	}
	return null;
}

describe.each([
	['indentItem', indentItem, 1],
	['outdentItem', outdentItem, -1],
])('%s on generated notes', (_name, operation, change) => {
	describe.each(MARKER_SETS)('$name', ({ markers }) => {
		it.each(STYLES)(
			'agrees with Lezer and only changes leading whitespace in $name documents',
			(style) => {
				expect(firstProblem(operation, change, markers, style)).toBeNull();
			},
		);
	});
});
