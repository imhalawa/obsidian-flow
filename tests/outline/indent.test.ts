import { describe, expect, it } from 'vitest';
import { indentItem, outdentItem } from '../../src/outline/indent';
import type { IndentStyle } from '../../src/outline/indent-style';
import { lezerShape } from '../support/lezer-shape';
import { resultingLines } from '../support/run-edit';

const spaces2: IndentStyle = { useTabs: false, unitColumns: 2, tabSize: 4 };
const spaces4: IndentStyle = { useTabs: false, unitColumns: 4, tabSize: 4 };
const tabs: IndentStyle = { useTabs: true, unitColumns: 4, tabSize: 4 };

const indented = (lines: string[], style: IndentStyle, lineIndex: number) =>
	resultingLines(lines, indentItem(lines, style, lineIndex));

const outdented = (lines: string[], style: IndentStyle, lineIndex: number) =>
	resultingLines(lines, outdentItem(lines, style, lineIndex));

describe('edit lists', () => {
	it('lists one edit per changed line when renumbering', () => {
		expect(indentItem(['- a', '10. b'], spaces2, 1)).toEqual({
			ok: true,
			edits: [{ lineIndex: 1, text: '  1. b' }],
		});
	});

	it('does not list a line that renumbering leaves unchanged', () => {
		expect(outdentItem(['- a', '  - b', '  1. c'], spaces2, 1)).toEqual({
			ok: true,
			edits: [{ lineIndex: 1, text: '- b' }],
		});
	});

	it('does not renumber text that only looks like a marker', () => {
		expect(indented(['- a', '- 2. b'], spaces2, 1)).toEqual(['- a', '  - 2. b']);
	});
});

describe('indentItem', () => {
	it.each([
		['two space unit', ['- a', '- b'], spaces2, 1, ['- a', '  - b']],
		['four space unit', ['- a', '- b'], spaces4, 1, ['- a', '    - b']],
		['tab unit', ['- a', '- b'], tabs, 1, ['- a', '\t- b']],
		['ordered parent widens the indent', ['1. a', '1. b'], spaces2, 1, ['1. a', '   1. b']],
		['bullet under a task', ['- [ ] a', '- b'], spaces2, 1, ['- [ ] a', '  - b']],
		['the subtree follows', ['- a', '- b', '  - c'], spaces2, 1, ['- a', '  - b', '    - c']],
		[
			'continuation lines follow',
			['- a', '- b', '  more'],
			spaces2,
			1,
			['- a', '  - b', '    more'],
		],
		[
			'blank lines stay blank',
			['- a', '- b', '', '  para'],
			spaces2,
			1,
			['- a', '  - b', '', '    para'],
		],
		[
			'matches the indent of existing children',
			['- a', '    - x', '- b'],
			spaces2,
			2,
			['- a', '    - x', '    - b'],
		],
		[
			'nested item under its sibling',
			['- a', '  - b', '  - c'],
			spaces2,
			2,
			['- a', '  - b', '    - c'],
		],
		[
			'only the target subtree moves',
			['- a', '- b', '- c'],
			spaces2,
			1,
			['- a', '  - b', '- c'],
		],
	])('%s', (_name, lines, style, lineIndex, expected) => {
		expect(indented(lines, style, lineIndex)).toEqual(expected);
	});

	it('indents the item that owns a continuation line', () => {
		expect(indented(['- a', '- b', '  more'], spaces2, 2)).toEqual([
			'- a',
			'  - b',
			'    more',
		]);
	});

	it.each([
		['number over one', ['- a', '10. b'], 1, ['- a', '  1. b']],
		['paren delimiter', ['- a', '3) b'], 1, ['- a', '  1) b']],
		['already one', ['- a', '1. b'], 1, ['- a', '  1. b']],
		['not first child', ['- a', '  - x', '10. b'], 2, ['- a', '  - x', '  10. b']],
	])(
		'renumbers an ordered item that starts a sublist: %s',
		(_name, lines, lineIndex, expected) => {
			expect(indented(lines, spaces2, lineIndex)).toEqual(expected);
		},
	);

	it('keeps the indented ordered item a list item for Lezer', () => {
		const after = indented(['- a', '10. b'], spaces2, 1);
		expect(lezerShape(after as string[])).toEqual(['0:a', '1:b']);
	});

	it('keeps the children of a renumbered item inside it', () => {
		expect(indented(['- a', '10. b', '    - c'], spaces2, 1)).toEqual([
			'- a',
			'  1. b',
			'      - c',
		]);
	});

	it.each([
		['first item', ['- a'], 0, 'no-previous-sibling'],
		['first child', ['- a', '  - b'], 1, 'no-previous-sibling'],
		['plain text', ['text'], 0, 'not-a-list-item'],
		['blank line after the list', ['- a', '- b', '', 'text'], 3, 'not-a-list-item'],
		['line past the end', ['- a'], 5, 'not-a-list-item'],
		['negative line', ['- a'], -1, 'not-a-list-item'],
	])('refuses the %s', (_name, lines, lineIndex, reason) => {
		expect(indented(lines, spaces2, lineIndex)).toBe(reason);
	});
});

describe('outdentItem', () => {
	it.each([
		['one level', ['- a', '  - b'], spaces2, 1, ['- a', '- b']],
		[
			'later siblings become children',
			['- a', '  - b', '  - c'],
			spaces2,
			1,
			['- a', '- b', '  - c'],
		],
		['the subtree follows', ['- a', '  - b', '    - x'], spaces2, 1, ['- a', '- b', '  - x']],
		[
			'later siblings join existing children',
			['- a', '  - b', '    - x', '  - c'],
			spaces2,
			1,
			['- a', '- b', '  - x', '  - c'],
		],
		['tabs', ['- a', '\t- b', '\t- c'], tabs, 1, ['- a', '- b', '\t- c']],
		['four spaces', ['- a', '    - b', '    - c'], spaces4, 1, ['- a', '- b', '    - c']],
		['deep item', ['- a', '  - b', '    - c'], spaces2, 2, ['- a', '  - b', '  - c']],
		['ordered items', ['1. a', '   1. b'], spaces2, 1, ['1. a', '1. b']],
		[
			'continuation lines follow',
			['- a', '  - b', '    more'],
			spaces2,
			1,
			['- a', '- b', '  more'],
		],
		[
			'last sibling leaves nothing behind',
			['- a', '  - b', '- c'],
			spaces2,
			1,
			['- a', '- b', '- c'],
		],
	])('%s', (_name, lines, style, lineIndex, expected) => {
		expect(outdented(lines, style, lineIndex)).toEqual(expected);
	});

	it.each([
		['number over one', ['- a', '  - b', '  10. c'], ['- a', '- b', '  1. c']],
		['paren delimiter', ['- a', '  - b', '  3) c'], ['- a', '- b', '  1) c']],
		[
			'item that has children keeps numbers',
			['- a', '  - b', '    - x', '  10. c'],
			['- a', '- b', '  - x', '  10. c'],
		],
	])('renumbers the first later sibling that starts a sublist: %s', (_name, lines, expected) => {
		expect(outdented(lines, spaces2, 1)).toEqual(expected);
	});

	it.each([
		['top level item', ['- a', '- b'], 1, 'top-level'],
		['plain text', ['text'], 0, 'not-a-list-item'],
	])('refuses the %s', (_name, lines, lineIndex, reason) => {
		expect(outdented(lines, spaces2, lineIndex)).toBe(reason);
	});
});
