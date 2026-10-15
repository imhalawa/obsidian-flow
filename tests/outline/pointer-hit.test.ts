import { describe, expect, it } from 'vitest';
import { itemStartingAt } from '../../src/outline/item-lookup';
import { parseOutline } from '../../src/outline/outline-tree';
import {
	bulletMarker,
	containsX,
	expandToMinimumWidth,
	threadParent,
} from '../../src/outline/pointer-hit';

const lines = ['text', '- a', '  - b', '    - c', '  1. d', '- [ ] e', '* f', '+ g'];
const tree = parseOutline(lines, 4);
const itemAt = (startLine: number) => {
	const item = itemStartingAt(tree, startLine);
	if (!item) throw new Error(`No item starts at line ${startLine}`);
	return item;
};

describe('bulletMarker', () => {
	it.each([
		['a top level dash', 1, { startLine: 1, from: 0, to: 1 }],
		['a nested dash', 2, { startLine: 2, from: 2, to: 3 }],
		['a star', 6, { startLine: 6, from: 0, to: 1 }],
		['a plus', 7, { startLine: 7, from: 0, to: 1 }],
	])('finds the marker of %s', (_name, line, expected) => {
		expect(bulletMarker(tree, line)).toEqual(expected);
	});

	it.each([
		['an ordered item', 4],
		['a task item', 5],
		['a line that is not an item', 0],
		['a line past the end', 99],
	])('finds no bullet on %s', (_name, line) => {
		expect(bulletMarker(tree, line)).toBeNull();
	});
});

describe('expandToMinimumWidth', () => {
	it.each([
		['a narrow interval', { left: 10, right: 14 }, 24, { left: 0, right: 24 }],
		['a wide interval', { left: 0, right: 40 }, 24, { left: 0, right: 40 }],
		['an interval as wide as the minimum', { left: 5, right: 29 }, 24, { left: 5, right: 29 }],
	])('widens %s around its center', (_name, interval, minimum, expected) => {
		expect(expandToMinimumWidth(interval, minimum)).toEqual(expected);
	});
});

describe('containsX', () => {
	it.each([
		['inside', 5, true],
		['on the left edge', 0, true],
		['on the right edge', 10, true],
		['left of it', -1, false],
		['right of it', 11, false],
	])('says %s', (_name, x, expected) => {
		expect(containsX({ left: 0, right: 10 }, x)).toBe(expected);
	});
});

describe('threadParent', () => {
	const guideX = (parent: { startLine: number }) => parent.startLine * 100;

	it('finds the parent whose thread line is under the pointer', () => {
		expect(threadParent(tree, 3, 200, guideX, 12)?.startLine).toBe(2);
	});

	it('finds a higher ancestor on the same line', () => {
		expect(threadParent(tree, 3, 100, guideX, 12)?.startLine).toBe(1);
	});

	it('accepts a pointer within the half width of the line', () => {
		expect(threadParent(tree, 3, 212, guideX, 12)?.startLine).toBe(2);
	});

	it('finds nothing when the pointer is farther than the half width', () => {
		expect(threadParent(tree, 3, 213, guideX, 12)).toBeNull();
	});

	it('picks the closest line when two are within reach', () => {
		expect(threadParent(tree, 3, 150, guideX, 60)?.startLine).toBe(1);
		expect(threadParent(tree, 3, 151, guideX, 60)?.startLine).toBe(2);
	});

	it('skips a parent whose thread line cannot be placed', () => {
		const unplaced = (parent: { startLine: number }) => (parent.startLine === 2 ? null : 100);
		expect(threadParent(tree, 3, 200, unplaced, 12)).toBeNull();
		expect(threadParent(tree, 3, 100, unplaced, 12)?.startLine).toBe(1);
	});

	it('finds nothing on the line of a top level item', () => {
		expect(threadParent(tree, 1, 100, guideX, 12)).toBeNull();
	});

	it('finds nothing on a line outside the list', () => {
		expect(threadParent(tree, 0, 100, guideX, 12)).toBeNull();
	});

	it('does not offer the item of the line itself', () => {
		expect(threadParent(tree, 2, 200, guideX, 12)).toBeNull();
	});
});
