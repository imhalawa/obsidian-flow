import { describe, expect, it } from 'vitest';
import { applyEdits, lineAt, mapLine, mapLineThrough, refuse } from '../../src/outline/line-edit';

describe('applyEdits', () => {
	it('replaces the text of the edited lines only', () => {
		const lines = ['a', 'b', 'c'];
		expect(applyEdits(lines, [{ lineIndex: 1, text: 'B' }])).toEqual(['a', 'B', 'c']);
	});

	it('does not change the input', () => {
		const lines = ['a'];
		applyEdits(lines, [{ lineIndex: 0, text: 'z' }]);
		expect(lines).toEqual(['a']);
	});

	it('returns an equal copy for no edits', () => {
		expect(applyEdits(['a', 'b'], [])).toEqual(['a', 'b']);
	});
});

describe('refuse', () => {
	it('carries the reason', () => {
		expect(refuse('top-level')).toEqual({ ok: false, reason: 'top-level' });
	});
});

describe('mapLine', () => {
	const moves = [
		{ fromLine: 4, toLine: 5, delta: -2 },
		{ fromLine: 2, toLine: 3, delta: 2 },
	];

	it.each([
		[0, 0],
		[1, 1],
		[2, 4],
		[3, 5],
		[4, 2],
		[5, 3],
		[6, 6],
	])('sends line %i to line %i', (line, expected) => {
		expect(mapLine(line, moves)).toBe(expected);
	});

	it('keeps every line in place without moves', () => {
		expect(mapLine(3, [])).toBe(3);
	});
});

describe('lineAt', () => {
	it.each([
		[0, 'a'],
		[1, 'b'],
		[2, ''],
		[-1, ''],
	])('reads line %i as %j', (index, expected) => {
		expect(lineAt(['a', 'b'], index)).toBe(expected);
	});
});

describe('mapLineThrough', () => {
	it('applies each step to the result of the one before', () => {
		const steps = [
			[{ fromLine: 0, toLine: 0, delta: 2 }],
			[{ fromLine: 2, toLine: 2, delta: 3 }],
		];
		expect(mapLineThrough(0, steps)).toBe(5);
	});

	it('keeps lines in place without steps', () => {
		expect(mapLineThrough(4, [])).toBe(4);
	});
});
