import { describe, expect, it } from 'vitest';
import { itemAtLine } from '../../src/outline/item-lookup';
import { parseOutline } from '../../src/outline/outline-tree';

const lines = ['text', '- a', '  - b', '', '  para of a', '- c'];
const tree = parseOutline(lines, 4);
const startOf = (lineIndex: number) => itemAtLine(tree, lineIndex)?.startLine;

describe('itemAtLine', () => {
	it.each([
		[0, undefined],
		[1, 1],
		[2, 2],
		[3, 1],
		[4, 1],
		[5, 5],
		[6, undefined],
		[-1, undefined],
	])('maps line %i to the item starting at %s', (lineIndex, expected) => {
		expect(startOf(lineIndex)).toBe(expected);
	});
});
