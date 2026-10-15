import { describe, expect, it } from 'vitest';
import { allFoldSpans, foldLookup } from '../../src/outline/fold';

const lines = ['# Title', '- a', '  - b', '    - c', '    more c', '  - d', '- e', '', 'text'];

describe('foldLookup', () => {
	it.each([
		['a parent on its own line', 1, { fromLine: 1, toLine: 5 }],
		['a child that is a parent', 2, { fromLine: 2, toLine: 4 }],
		['a line inside the subtree resolves to the deepest item', 5, null],
	])('folds %s', (_name, cursorLine, span) => {
		const lookup = foldLookup(lines, 4, cursorLine);
		expect(lookup).toEqual(span ? { kind: 'span', span } : { kind: 'no-children' });
	});

	it('picks the deepest item when the cursor is on a continuation line', () => {
		expect(foldLookup(lines, 4, 4)).toEqual({ kind: 'no-children' });
	});

	it.each([
		['a heading', 0],
		['a blank line', 7],
		['a paragraph', 8],
		['a line past the end', 99],
	])('reports no list item on %s', (_name, cursorLine) => {
		expect(foldLookup(lines, 4, cursorLine)).toEqual({ kind: 'not-a-list-item' });
	});

	it('reports a leaf as having no children', () => {
		expect(foldLookup(lines, 4, 6)).toEqual({ kind: 'no-children' });
	});

	it('reports no list item in an empty note', () => {
		expect(foldLookup([''], 4, 0)).toEqual({ kind: 'not-a-list-item' });
	});
});

describe('allFoldSpans', () => {
	it('returns every parent item in document order', () => {
		expect(allFoldSpans(lines, 4, { fromLine: 0, toLine: 8 })).toEqual([
			{ fromLine: 1, toLine: 5 },
			{ fromLine: 2, toLine: 4 },
		]);
	});

	it('limits the result to items inside a range', () => {
		expect(allFoldSpans(lines, 4, { fromLine: 2, toLine: 5 })).toEqual([
			{ fromLine: 2, toLine: 4 },
		]);
	});

	it('leaves out an item that only partly lies inside the range', () => {
		expect(allFoldSpans(lines, 4, { fromLine: 1, toLine: 4 })).toEqual([
			{ fromLine: 2, toLine: 4 },
		]);
	});

	it('returns nothing for a note without parents', () => {
		expect(allFoldSpans(['- a', '- b'], 4, { fromLine: 0, toLine: 1 })).toEqual([]);
		expect(allFoldSpans([''], 4, { fromLine: 0, toLine: 0 })).toEqual([]);
	});
});
