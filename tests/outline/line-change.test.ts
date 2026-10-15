import { describe, expect, it } from 'vitest';
import { mapColumn, minimalChange } from '../../src/outline/line-change';

describe('minimalChange', () => {
	it.each([
		['indent', '- b', '  - b', { from: 0, to: 0, insert: '  ' }],
		['outdent', '  - b', '- b', { from: 0, to: 2, insert: '' }],
		['renumber with indent', '10. b', '  1. b', { from: 0, to: 2, insert: '  1' }],
		['change in the middle', 'abcde', 'abXde', { from: 2, to: 3, insert: 'X' }],
		['same text', '- b', '- b', { from: 3, to: 3, insert: '' }],
		['empty to text', '', 'ab', { from: 0, to: 0, insert: 'ab' }],
		['text to empty', 'ab', '', { from: 0, to: 2, insert: '' }],
		['repeated characters', 'aa', 'aaa', { from: 2, to: 2, insert: 'a' }],
	])('%s', (_name, before, after, expected) => {
		expect(minimalChange(before, after)).toEqual(expected);
	});

	it('never lets the prefix and the suffix overlap', () => {
		const change = minimalChange('abab', 'ab');
		expect(change.from + (4 - change.to)).toBeLessThanOrEqual(2);
	});
});

describe('mapColumn', () => {
	const insertion = { from: 0, to: 0, insert: '  ' };
	const removal = { from: 0, to: 2, insert: '' };
	const replacement = { from: 0, to: 2, insert: '  1' };

	it.each([
		[insertion, 0, 2],
		[insertion, 3, 5],
		[removal, 0, 0],
		[removal, 1, 0],
		[removal, 2, 0],
		[removal, 5, 3],
		[replacement, 0, 3],
		[replacement, 1, 3],
		[replacement, 2, 3],
		[replacement, 6, 7],
		[{ from: 4, to: 4, insert: 'xy' }, 3, 3],
		[{ from: 4, to: 4, insert: 'xy' }, 4, 6],
	])('maps change %j at column %i to %i', (change, column, expected) => {
		expect(mapColumn(change, column)).toBe(expected);
	});
});
