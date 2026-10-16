import { describe, expect, it } from 'vitest';
import { shiftedLines, zoomIndentColumns } from '../../src/outline/zoom-shift';
import { parseOutline } from '../../src/outline/outline-tree';

const NOTE = ['# T', '- a', '\t- b', '\t\t- c', '\t\t  more c', '\t- d', '- e'];
const columnsAt = (lines: readonly string[], tabSize: number, startLine: number) =>
	zoomIndentColumns(lines, parseOutline(lines, tabSize), tabSize, startLine);

describe('zoomIndentColumns', () => {
	it.each([
		['a top level item', 1, 0],
		['a second level item', 2, 4],
		['a third level item', 3, 8],
		['a heading', 0, 0],
		['a line that is not zoomable', 4, 0],
	])('counts the columns of %s', (_name, startLine, expected) => {
		expect(columnsAt(NOTE, 4, startLine)).toBe(expected);
	});

	it.each([
		[['- a', '    - b'], 4, 4],
		[['- a', '  - b'], 4, 2],
		[['- a', '  - b'], 2, 2],
		[['- a', '  - b', '    - c'], 4, 2],
	])('counts the columns of spaces in %j at tab size %i', (lines, tabSize, expected) => {
		expect(columnsAt(lines, tabSize, 1)).toBe(expected);
	});
});

describe('shiftedLines', () => {
	it('lists the zoomed lines that are indented at least as deep as the zoomed item', () => {
		expect(shiftedLines(NOTE, 4, { fromLine: 2, toLine: 5 }, 4)).toEqual([2, 3, 4, 5]);
	});

	it('lists nothing when the zoomed item is at the left edge', () => {
		expect(shiftedLines(NOTE, 4, { fromLine: 1, toLine: 6 }, 0)).toEqual([]);
	});

	it('skips blank lines', () => {
		expect(shiftedLines(['\t- a', '', '\t- b'], 4, { fromLine: 0, toLine: 2 }, 4)).toEqual([
			0, 2,
		]);
	});

	it('skips lines less indented than the zoomed item', () => {
		expect(shiftedLines(['- a', '\t- b', 'plain'], 4, { fromLine: 1, toLine: 2 }, 4)).toEqual([
			1,
		]);
	});

	it('keeps lines indented with two spaces when the zoomed item uses two spaces and the tab size is four', () => {
		expect(shiftedLines(['- a', '  - b', '    - c'], 4, { fromLine: 1, toLine: 2 }, 2)).toEqual(
			[1, 2],
		);
	});
});
