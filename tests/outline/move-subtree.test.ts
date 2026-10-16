import { describe, expect, it } from 'vitest';
import type { IndentStyle } from '../../src/outline/indent-style';
import {
	lineAfterMove,
	moveSubtree,
	placeSubtree,
	takeSubtree,
	type DropDestination,
} from '../../src/outline/move-subtree';

const tabs: IndentStyle = { useTabs: true, unitColumns: 4, tabSize: 4 };
const spaces: IndentStyle = { useTabs: false, unitColumns: 2, tabSize: 4 };

const moved = (
	lines: string[],
	style: IndentStyle,
	source: number,
	destination: DropDestination,
) => {
	const result = moveSubtree(lines, style, source, destination);
	if (!result.ok) throw new Error(result.reason);
	return result;
};

describe('lineAfterMove', () => {
	it.each([
		['a line before both places', 0, 3, 2, 5, 0],
		['the first line of the block', 3, 3, 2, 6, 6],
		['the last line of the block', 4, 3, 2, 6, 7],
		['a line right after the block when the block moves down', 5, 3, 2, 8, 3],
		['a line right before where the block lands', 7, 3, 2, 8, 5],
		['a line right after where the block lands', 10, 3, 2, 8, 10],
		['a line after both places', 12, 3, 2, 8, 12],
		['a line between the places when the block moves up', 4, 6, 2, 2, 6],
		['the line before the block when the block moves up', 5, 6, 2, 2, 7],
		['the line where the block lands when it moves up', 2, 6, 2, 2, 4],
	])('maps %s', (_name, line, sourceLine, blockLength, blockStart, expected) => {
		expect(lineAfterMove(line, sourceLine, blockLength, blockStart)).toBe(expected);
	});
});

describe('takeSubtree', () => {
	it('cuts an item with its descendants', () => {
		expect(takeSubtree(['- a', '  - b', '    - c', '- d'], spaces, 1)).toEqual({
			ok: true,
			block: ['  - b', '    - c'],
			remaining: ['- a', '- d'],
		});
	});

	it('cuts continuation lines with the item', () => {
		expect(takeSubtree(['- a', '  more', '- b'], spaces, 0)).toEqual({
			ok: true,
			block: ['- a', '  more'],
			remaining: ['- b'],
		});
	});

	it('leaves blank lines after the item where they are', () => {
		expect(takeSubtree(['- a', '', '- b'], spaces, 0)).toEqual({
			ok: true,
			block: ['- a'],
			remaining: ['', '- b'],
		});
	});

	it('keeps a line of spaces after the item where it is', () => {
		expect(takeSubtree(['- a', '   ', '- b'], spaces, 0)).toEqual({
			ok: true,
			block: ['- a'],
			remaining: ['   ', '- b'],
		});
	});

	it('refuses to cut an item when what stays would read as a different list', () => {
		expect(takeSubtree(['   - y', '    - c', '', 'text'], spaces, 0)).toEqual({
			ok: false,
			reason: 'structure-check-failed',
		});
	});

	it.each([[5], [-1]])('refuses line %i, which does not start an item', (line) => {
		expect(takeSubtree(['- a'], spaces, line)).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});

	it('refuses a continuation line', () => {
		expect(takeSubtree(['- a', '  more'], spaces, 1)).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});
});

describe('moveSubtree', () => {
	it.each([
		['before an earlier sibling', ['- a', '- b', '- c'], 2, 'before', 0, ['- c', '- a', '- b']],
		['before a later sibling', ['- a', '- b', '- c'], 0, 'before', 2, ['- b', '- a', '- c']],
		['after a later sibling', ['- a', '- b', '- c'], 0, 'after', 2, ['- b', '- c', '- a']],
		['after an earlier sibling', ['- a', '- b', '- c'], 2, 'after', 0, ['- a', '- c', '- b']],
		['as the first child of a sibling', ['- a', '- b'], 1, 'first-child', 0, ['- a', '  - b']],
		[
			'as the first child before the existing children',
			['- a', '  - x', '- b'],
			2,
			'first-child',
			0,
			['- a', '  - b', '  - x'],
		],
	] as const)('moves an item %s', (_name, lines, source, kind, targetLine, expected) => {
		expect(moved([...lines], spaces, source, { kind, targetLine }).lines).toEqual(expected);
	});

	it('moves the subtree with the item', () => {
		const lines = ['- a', '- b', '  - c', '    - d', '- e'];
		expect(moved(lines, spaces, 1, { kind: 'after', targetLine: 4 }).lines).toEqual([
			'- a',
			'- e',
			'- b',
			'  - c',
			'    - d',
		]);
	});

	it('reindents the subtree when the item gets a new level', () => {
		const lines = ['- a', '  - b', '    - c', '- d'];
		expect(moved(lines, spaces, 1, { kind: 'after', targetLine: 3 }).lines).toEqual([
			'- a',
			'- d',
			'- b',
			'  - c',
		]);
	});

	it('moves a nested item deeper into another branch with tabs', () => {
		const lines = ['- a', '\t- b', '\t\t- c', '- d', '\t- e'];
		expect(moved(lines, tabs, 2, { kind: 'after', targetLine: 4 }).lines).toEqual([
			'- a',
			'\t- b',
			'- d',
			'\t- e',
			'\t- c',
		]);
	});

	it('moves an item to the top level before a top level item', () => {
		const lines = ['- a', '  - b', '- c'];
		expect(moved(lines, spaces, 1, { kind: 'before', targetLine: 2 }).lines).toEqual([
			'- a',
			'- b',
			'- c',
		]);
	});

	it('takes the indent of the existing children for a new first child', () => {
		const lines = ['- a', '    - x', '- b'];
		expect(moved(lines, spaces, 2, { kind: 'first-child', targetLine: 0 }).lines).toEqual([
			'- a',
			'    - b',
			'    - x',
		]);
	});

	it('reports how many lines the moved block has', () => {
		expect(
			moved(['- a', '  - b', '- c'], spaces, 0, { kind: 'after', targetLine: 2 }).blockLength,
		).toBe(2);
	});

	it('reports the line where the moved block starts', () => {
		expect(
			moved(['- a', '- b', '- c'], spaces, 0, { kind: 'after', targetLine: 2 }).blockStart,
		).toBe(2);
	});

	it('numbers an ordered item from one when it becomes the first child of a childless item', () => {
		const lines = ['- a', '5. b'];
		expect(moved(lines, spaces, 1, { kind: 'first-child', targetLine: 0 }).lines).toEqual([
			'- a',
			'  1. b',
		]);
	});

	it('keeps the number of an ordered item that joins existing children', () => {
		const lines = ['- a', '  - x', '5. b'];
		expect(moved(lines, spaces, 2, { kind: 'first-child', targetLine: 0 }).lines).toEqual([
			'- a',
			'  5. b',
			'  - x',
		]);
	});

	it('keeps the note the same when the item is dropped where it is', () => {
		const lines = ['- a', '- b', '- c'];
		expect(moved(lines, spaces, 1, { kind: 'after', targetLine: 0 }).lines).toEqual(lines);
	});

	it.each([
		['the item itself', 1, 1],
		['a descendant', 1, 2],
	])('refuses a drop on %s', (_name, source, targetLine) => {
		const lines = ['- a', '- b', '  - c', '- d'];
		expect(moveSubtree(lines, spaces, source, { kind: 'before', targetLine })).toEqual({
			ok: false,
			reason: 'drop-into-self',
		});
	});

	it('refuses a source that is not an item', () => {
		expect(moveSubtree(['text', '- a'], spaces, 0, { kind: 'before', targetLine: 1 })).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});

	it('refuses a target that is not an item', () => {
		expect(
			moveSubtree(['- a', '', 'text', '- b'], spaces, 3, { kind: 'before', targetLine: 2 }),
		).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});
});

describe('placeSubtree', () => {
	it('places a block cut from another note', () => {
		const result = placeSubtree(['- x', '- y'], spaces, ['\t\t- a', '\t\t\t- b'], {
			kind: 'after',
			targetLine: 0,
		});
		expect(result).toEqual({
			ok: true,
			lines: ['- x', '- a', '    - b', '- y'],
			blockStart: 1,
			blockLength: 2,
		});
	});

	it('places the block after the whole subtree of the target', () => {
		const result = placeSubtree(['- x', '  - y', '- z'], spaces, ['- a'], {
			kind: 'after',
			targetLine: 0,
		});
		expect(result).toMatchObject({ lines: ['- x', '  - y', '- a', '- z'], blockStart: 2 });
	});

	it('places the block before blank lines that follow the target', () => {
		const result = placeSubtree(['- x', '', '- z'], spaces, ['- a'], {
			kind: 'after',
			targetLine: 0,
		});
		expect(result).toMatchObject({ lines: ['- x', '- a', '', '- z'] });
	});

	it('places the block after the continuation lines of a target when it becomes a child', () => {
		const result = placeSubtree(['- x', '  more', '- z'], spaces, ['- a'], {
			kind: 'first-child',
			targetLine: 0,
		});
		expect(result).toMatchObject({ lines: ['- x', '  more', '  - a', '- z'], blockStart: 2 });
	});

	it('refuses a place where the result would read as a different list', () => {
		const lines = ['1. x', '  - b', '', 'text'];
		expect(placeSubtree(lines, spaces, ['- z'], { kind: 'after', targetLine: 0 })).toEqual({
			ok: false,
			reason: 'structure-check-failed',
		});
	});

	it('refuses a block that is not a single item', () => {
		expect(
			placeSubtree(['- x'], spaces, ['- a', '- b'], { kind: 'after', targetLine: 0 }),
		).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});

	it('refuses an empty block', () => {
		expect(placeSubtree(['- x'], spaces, [], { kind: 'after', targetLine: 0 })).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});

	it('refuses a target line that is not an item', () => {
		expect(
			placeSubtree(['- x', 'text'], spaces, ['- a'], { kind: 'after', targetLine: 1 }),
		).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});
});
