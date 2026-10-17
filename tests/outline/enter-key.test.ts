import { describe, expect, it } from 'vitest';
import { enterOnEmptyItem, enterOnParentItem } from '../../src/outline/enter-key';
import type { IndentStyle } from '../../src/outline/indent-style';

const tabs: IndentStyle = { useTabs: true, unitColumns: 4, tabSize: 4 };
const spaces: IndentStyle = { useTabs: false, unitColumns: 2, tabSize: 4 };

describe('enterOnEmptyItem', () => {
	it('ends the list when a top level item is empty', () => {
		expect(enterOnEmptyItem(['- a', '- '], tabs, 1, 2)).toEqual({
			fromLine: 1,
			toLine: 1,
			text: '',
			caret: 0,
		});
	});

	it.each([
		['bullet', '* '],
		['ordered', '2. '],
		['empty task', '- [ ] '],
		['checked empty task', '- [x] '],
	])('ends the list at an empty %s item', (_name, line) => {
		expect(enterOnEmptyItem(['- a', line], tabs, 1, line.length)).toMatchObject({
			text: '',
			caret: 0,
		});
	});

	it('outdents an empty nested item and keeps the caret at its end', () => {
		expect(enterOnEmptyItem(['- a', '  - '], spaces, 1, 4)).toEqual({
			fromLine: 1,
			toLine: 1,
			text: '- ',
			caret: 2,
		});
	});

	it('outdents one level at a time', () => {
		expect(enterOnEmptyItem(['- a', '\t- b', '\t\t- '], tabs, 2, 4)).toEqual({
			fromLine: 2,
			toLine: 2,
			text: '\t- ',
			caret: 3,
		});
	});

	it('renumbers the later sibling of an outdented ordered item and covers both lines', () => {
		expect(enterOnEmptyItem(['- a', '  1. ', '  2. c'], spaces, 1, 5)).toEqual({
			fromLine: 1,
			toLine: 2,
			text: '1. \n   1. c',
			caret: 3,
		});
	});

	it.each([
		['the caret is not at the end', ['- a', '  - '], 1, 3],
		['the item has text', ['- a', '  - b'], 1, 5],
		['the line is not an item', ['- a', ''], 1, 0],
		['the line is a continuation of an item', ['- a', '  '], 1, 2],
		['the line does not exist', ['- a'], 3, 0],
		['the line only looks like an item', ['text', '    - '], 1, 6],
	])('does nothing when %s', (_name, lines, line, column) => {
		expect(enterOnEmptyItem(lines, spaces, line, column)).toBeNull();
	});

	it('does nothing for an empty item that has children', () => {
		expect(enterOnEmptyItem(['- ', '  - b'], spaces, 0, 2)).toBeNull();
	});

	it('does nothing for an empty item that continues on the next line', () => {
		expect(enterOnEmptyItem(['- ', '  more'], spaces, 0, 2)).toBeNull();
	});

	it('does nothing when the line index is not the start of an item', () => {
		expect(enterOnEmptyItem(['- a', '  more', '  - '], spaces, 1, 6)).toBeNull();
	});
});

describe('enterOnParentItem', () => {
	it('adds a first child at the indent of the existing first child', () => {
		expect(enterOnParentItem(['- a', '  - b'], 4, 0, 3)).toEqual({
			fromLine: 0,
			toLine: 0,
			text: '- a\n  - ',
			caret: 8,
		});
	});

	it('keeps the marker and the gap of the first child', () => {
		expect(enterOnParentItem(['- a', '\t*   b'], 4, 0, 3)).toMatchObject({
			text: '- a\n\t*   ',
		});
	});

	it.each([
		['an unchecked task', '- [ ] b'],
		['a checked task', '- [x] b'],
	])('adds an unchecked task when the first child is %s', (_name, child) => {
		expect(enterOnParentItem(['- a', `  ${child}`], 4, 0, 3)?.text).toBe('- a\n  - [ ] ');
	});

	it('adds the child after the own notes of the item', () => {
		expect(enterOnParentItem(['- a', '  notes', '    - b'], 4, 1, 7)).toEqual({
			fromLine: 1,
			toLine: 1,
			text: '  notes\n    - ',
			caret: 14,
		});
	});

	it('adds a child to a nested item', () => {
		expect(enterOnParentItem(['- a', '  - b', '    - c'], 4, 1, 5)?.text).toBe('  - b\n    - ');
	});

	it.each([
		['the caret is not at the end', ['- a', '  - b'], 0, 2],
		['the item has no children', ['- a', '- b'], 0, 3],
		['the caret is not on the last line of the own text', ['- a', '  notes', '  - b'], 0, 3],
		['the first child is ordered', ['- a', '  1. b'], 0, 3],
		['the line is not an item', ['text', '- b'], 0, 4],
		['the line does not exist', ['- a', '  - b'], 5, 0],
	])('does nothing when %s', (_name, lines, line, column) => {
		expect(enterOnParentItem(lines, 4, line, column)).toBeNull();
	});
});
