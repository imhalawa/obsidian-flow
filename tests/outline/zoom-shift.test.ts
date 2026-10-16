import { describe, expect, it } from 'vitest';
import { shiftedLines, zoomIndentLevels } from '../../src/outline/zoom-shift';

const NOTE = ['# T', '- a', '\t- b', '\t\t- c', '\t\t  more c', '\t- d', '- e'];

describe('zoomIndentLevels', () => {
	it.each([
		['a top level item', 1, 0],
		['a second level item', 2, 1],
		['a third level item', 3, 2],
		['a heading', 0, 0],
		['a line that is not zoomable', 4, 0],
	])('counts the levels of %s', (_name, startLine, expected) => {
		expect(zoomIndentLevels(NOTE, 4, startLine)).toBe(expected);
	});

	it('counts four spaces as one level', () => {
		expect(zoomIndentLevels(['- a', '    - b'], 4, 1)).toBe(1);
	});

	it('counts two spaces as one level when the tab size is two', () => {
		expect(zoomIndentLevels(['- a', '  - b'], 2, 1)).toBe(1);
	});
});

describe('shiftedLines', () => {
	it('lists the zoomed lines that are indented at least as deep as the zoomed item', () => {
		expect(shiftedLines(NOTE, 4, { fromLine: 2, toLine: 5 }, 1)).toEqual([2, 3, 4, 5]);
	});

	it('lists nothing when the zoomed item is at the left edge', () => {
		expect(shiftedLines(NOTE, 4, { fromLine: 1, toLine: 6 }, 0)).toEqual([]);
	});

	it('skips blank lines', () => {
		expect(shiftedLines(['\t- a', '', '\t- b'], 4, { fromLine: 0, toLine: 2 }, 1)).toEqual([
			0, 2,
		]);
	});

	it('skips lines less indented than the zoomed item', () => {
		expect(shiftedLines(['- a', '\t- b', 'plain'], 4, { fromLine: 1, toLine: 2 }, 1)).toEqual([
			1,
		]);
	});
});
