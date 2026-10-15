import { describe, expect, it } from 'vitest';
import { selectedItemLines } from '../../src/outline/selection';

const lines = ['- a', '  - b', '  - c', '    more c', '- d', '', 'text'];
const itemsFor = (...ranges: [number, number][]) =>
	selectedItemLines(
		lines,
		4,
		ranges.map(([fromLine, toLine]) => ({ fromLine, toLine })),
	);

describe('selectedItemLines', () => {
	it.each([
		['a cursor in an item', [[1, 1]], [1]],
		['a cursor in a continuation line', [[3, 3]], [2]],
		['two siblings', [[1, 2]], [1, 2]],
		['a parent and its children', [[0, 2]], [0]],
		['siblings at different levels', [[2, 4]], [2, 4]],
		['plain text only', [[6, 6]], []],
		['the whole note', [[0, 6]], [0, 4]],
		['a range that starts inside a continuation line', [[3, 4]], [2, 4]],
		[
			'two separate ranges',
			[
				[0, 0],
				[4, 4],
			],
			[0, 4],
		],
		[
			'overlapping ranges',
			[
				[1, 2],
				[2, 4],
			],
			[1, 2, 4],
		],
	] as [string, [number, number][], number[]][])('finds %s', (_name, ranges, expected) => {
		expect(itemsFor(...ranges)).toEqual(expected);
	});

	it('finds nothing without ranges', () => {
		expect(itemsFor()).toEqual([]);
	});
});
