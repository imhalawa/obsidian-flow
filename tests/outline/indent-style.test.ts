import { describe, expect, it } from 'vitest';
import { reindentLines, writeIndent, type IndentStyle } from '../../src/outline/indent-style';

const spaces2: IndentStyle = { useTabs: false, unitColumns: 2, tabSize: 4 };
const tabs: IndentStyle = { useTabs: true, unitColumns: 4, tabSize: 4 };

describe('writeIndent', () => {
	it.each([
		[0, spaces2, ''],
		[3, spaces2, '   '],
		[0, tabs, ''],
		[4, tabs, '\t'],
		[8, tabs, '\t\t'],
		[5, tabs, '\t '],
		[3, tabs, '   '],
	])('writes %i columns in style %j as %j', (columns, style, expected) => {
		expect(writeIndent(columns, style)).toBe(expected);
	});

	it('respects the tab size', () => {
		expect(writeIndent(5, { useTabs: true, unitColumns: 2, tabSize: 2 })).toBe('\t\t ');
	});
});

describe('reindentLines', () => {
	const lines = ['- a', '  - b', '', '    text', '- c'];

	it('shifts every non blank line in the range by the delta', () => {
		expect(reindentLines(lines, 0, 3, 2, spaces2)).toEqual([
			{ lineIndex: 0, text: '  - a' },
			{ lineIndex: 1, text: '    - b' },
			{ lineIndex: 3, text: '      text' },
		]);
	});

	it('leaves blank lines alone', () => {
		const edited = reindentLines(['  ', '- a'], 0, 1, 2, spaces2).map((edit) => edit.lineIndex);
		expect(edited).toEqual([1]);
	});

	it('shifts left and stops at column zero', () => {
		expect(reindentLines(['  - a', ' text'], 0, 1, -2, spaces2)).toEqual([
			{ lineIndex: 0, text: '- a' },
			{ lineIndex: 1, text: 'text' },
		]);
	});

	it('skips lines whose text would not change', () => {
		expect(reindentLines(['- a'], 0, 0, 0, spaces2)).toEqual([]);
	});

	it('rewrites the leading whitespace in the note style', () => {
		expect(reindentLines(['  - a'], 0, 0, 2, tabs)).toEqual([{ lineIndex: 0, text: '\t- a' }]);
	});

	it('only touches lines inside the range', () => {
		const edited = reindentLines(lines, 1, 1, 2, spaces2).map((edit) => edit.lineIndex);
		expect(edited).toEqual([1]);
	});
});
