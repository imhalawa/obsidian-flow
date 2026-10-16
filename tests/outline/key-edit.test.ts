import { describe, expect, it } from 'vitest';
import { spanEdit } from '../../src/outline/key-edit';

describe('spanEdit', () => {
	it('returns null when nothing changed', () => {
		expect(spanEdit(['a', 'b'], ['a', 'b'], 0, 0)).toBeNull();
	});

	it('covers one changed line and puts the caret in it', () => {
		expect(spanEdit(['a', 'b', 'c'], ['a', 'x', 'c'], 1, 1)).toEqual({
			fromLine: 1,
			toLine: 1,
			text: 'x',
			caret: 1,
		});
	});

	it('covers every line from the first change to the last', () => {
		expect(spanEdit(['a', 'b', 'c', 'd'], ['x', 'b', 'c', 'y'], 0, 1)).toEqual({
			fromLine: 0,
			toLine: 3,
			text: 'x\nb\nc\ny',
			caret: 1,
		});
	});

	it('counts the lines before the caret line in the caret offset', () => {
		expect(spanEdit(['a', 'b', 'c'], ['xx', 'yyy', 'c'], 1, 2)).toEqual({
			fromLine: 0,
			toLine: 1,
			text: 'xx\nyyy',
			caret: 5,
		});
	});

	it('widens the span to a caret line before the changes', () => {
		expect(spanEdit(['a', 'b', 'c'], ['a', 'b', 'x'], 0, 1)).toEqual({
			fromLine: 0,
			toLine: 2,
			text: 'a\nb\nx',
			caret: 1,
		});
	});

	it('widens the span to a caret line after the changes', () => {
		expect(spanEdit(['a', 'b', 'c'], ['x', 'b', 'c'], 2, 0)).toEqual({
			fromLine: 0,
			toLine: 2,
			text: 'x\nb\nc',
			caret: 4,
		});
	});
});
