import { describe, expect, it } from 'vitest';
import { itemStartingAt } from '../../src/outline/item-lookup';
import { parseOutline } from '../../src/outline/outline-tree';
import { breadcrumbs, hiddenRanges, zoomOutTarget, zoomRange } from '../../src/outline/zoom';

const lines = ['# Title', '- a', '  - b', '    - c', '    more c', '  - d', '- e', '', 'text'];
const tree = parseOutline(lines, 4);
const itemAt = (startLine: number) => {
	const item = itemStartingAt(tree, startLine);
	if (!item) throw new Error(`No item starts at line ${startLine}`);
	return item;
};

describe('itemStartingAt', () => {
	it.each([
		[1, 'a'],
		[3, 'c'],
		[6, 'e'],
	])('finds the item that starts at line %i', (line, text) => {
		expect(itemStartingAt(tree, line)?.text).toBe(text);
	});

	it.each([0, 4, 7, 8, 99, -1])('finds nothing at line %i', (line) => {
		expect(itemStartingAt(tree, line)).toBeNull();
	});
});

describe('zoomRange', () => {
	it.each([
		['a leaf', 5, { fromLine: 5, toLine: 5 }],
		['an item with continuation lines', 3, { fromLine: 3, toLine: 4 }],
		['a parent with children', 2, { fromLine: 2, toLine: 4 }],
		['a top level item with a whole subtree', 1, { fromLine: 1, toLine: 5 }],
		['the last item', 6, { fromLine: 6, toLine: 6 }],
	])('covers %s', (_name, line, expected) => {
		expect(zoomRange(itemAt(line))).toEqual(expected);
	});
});

describe('breadcrumbs', () => {
	it('lists every ancestor from the root and the item itself', () => {
		expect(breadcrumbs(itemAt(3))).toEqual([
			{ text: 'a', startLine: 1 },
			{ text: 'b', startLine: 2 },
			{ text: 'c', startLine: 3 },
		]);
	});

	it('lists only the item for a top level item', () => {
		expect(breadcrumbs(itemAt(6))).toEqual([{ text: 'e', startLine: 6 }]);
	});
});

describe('zoomOutTarget', () => {
	it('is the parent item', () => {
		expect(zoomOutTarget(itemAt(3))?.text).toBe('b');
	});

	it('is nothing for a top level item, meaning the full note', () => {
		expect(zoomOutTarget(itemAt(1))).toBeNull();
	});
});

describe('hiddenRanges', () => {
	it.each([
		[
			'a range in the middle',
			10,
			{ fromLine: 3, toLine: 5 },
			[
				{ fromLine: 0, toLine: 2 },
				{ fromLine: 6, toLine: 9 },
			],
		],
		['a range at the start', 10, { fromLine: 0, toLine: 4 }, [{ fromLine: 5, toLine: 9 }]],
		['a range at the end', 10, { fromLine: 6, toLine: 9 }, [{ fromLine: 0, toLine: 5 }]],
		['a range that is the whole note', 5, { fromLine: 0, toLine: 4 }, []],
		['a single line note', 1, { fromLine: 0, toLine: 0 }, []],
	])('hides what is outside %s', (_name, total, range, expected) => {
		expect(hiddenRanges(total, range)).toEqual(expected);
	});
});
