import { describe, expect, it } from 'vitest';
import type { IndentStyle } from '../../src/outline/indent-style';
import { moveItemDown, moveItemUp } from '../../src/outline/move';
import { resultingLines } from '../support/run-edit';

const spaces2: IndentStyle = { useTabs: false, unitColumns: 2, tabSize: 4 };

const movedUp = (lines: string[], lineIndex: number) =>
	resultingLines(lines, moveItemUp(lines, spaces2, lineIndex));

const movedDown = (lines: string[], lineIndex: number) =>
	resultingLines(lines, moveItemDown(lines, spaces2, lineIndex));

describe('moveItemUp', () => {
	it.each([
		['two items', ['- a', '- b'], 1, ['- b', '- a']],
		['last of three', ['- a', '- b', '- c'], 2, ['- a', '- c', '- b']],
		['subtrees travel', ['- a', '  - x', '- b', '  - y'], 2, ['- b', '  - y', '- a', '  - x']],
		[
			'continuation lines travel',
			['- a', '  text a', '- b', '  text b'],
			3,
			['- b', '  text b', '- a', '  text a'],
		],
		['nested siblings', ['- p', '  - a', '  - b'], 2, ['- p', '  - b', '  - a']],
		[
			'item after a deep subtree',
			['- a', '  - x', '    - y', '- b'],
			3,
			['- b', '- a', '  - x', '    - y'],
		],
		['blank line stays with its item', ['- a', '', '- b'], 2, ['- b', '- a', '']],
		['tasks', ['- [ ] a', '- [x] b'], 1, ['- [x] b', '- [ ] a']],
	])('%s', (_name, lines, lineIndex, expected) => {
		expect(movedUp(lines, lineIndex)).toEqual(expected);
	});

	it('moves the item that owns a continuation line', () => {
		expect(movedUp(['- a', '- b', '  more'], 2)).toEqual(['- b', '  more', '- a']);
	});

	it.each([
		['first item', ['- a', '- b'], 0, 'no-previous-sibling'],
		['first child', ['- a', '- p', '  - b'], 2, 'no-previous-sibling'],
		['plain text', ['text'], 0, 'not-a-list-item'],
	])('refuses the %s', (_name, lines, lineIndex, reason) => {
		expect(movedUp(lines, lineIndex)).toBe(reason);
	});

	it('lists no edits when the swap changes no line', () => {
		expect(moveItemUp(['- a', '- a'], spaces2, 1)).toEqual({ ok: true, edits: [] });
	});

	it('lists only the lines that change', () => {
		expect(moveItemUp(['- a', '- a', '- b'], spaces2, 2)).toEqual({
			ok: true,
			edits: [
				{ lineIndex: 1, text: '- b' },
				{ lineIndex: 2, text: '- a' },
			],
		});
	});
});

describe('moveItemDown', () => {
	it.each([
		['two items', ['- a', '- b'], 0, ['- b', '- a']],
		['first of three', ['- a', '- b', '- c'], 0, ['- b', '- a', '- c']],
		['subtrees travel', ['- a', '  - x', '- b', '  - y'], 0, ['- b', '  - y', '- a', '  - x']],
		['nested siblings', ['- p', '  - a', '  - b'], 1, ['- p', '  - b', '  - a']],
		['blank line stays with its item', ['- a', '', '- b'], 0, ['- b', '- a', '']],
	])('%s', (_name, lines, lineIndex, expected) => {
		expect(movedDown(lines, lineIndex)).toEqual(expected);
	});

	it.each([
		['last item', ['- a', '- b'], 1, 'no-next-sibling'],
		['last child', ['- p', '  - a', '- q'], 1, 'no-next-sibling'],
		['plain text', ['text'], 0, 'not-a-list-item'],
	])('refuses the %s', (_name, lines, lineIndex, reason) => {
		expect(movedDown(lines, lineIndex)).toBe(reason);
	});
});

describe('moving ordered items', () => {
	it.each([
		['numbers stay in position', ['1. a', '2. b'], 1, ['1. b', '2. a']],
		['paren delimiter', ['1) a', '2) b'], 1, ['1) b', '2) a']],
		['ordered then bullet travel with the item', ['1. a', '- b'], 1, ['- b', '1. a']],
		['bullets travel with the item', ['- a', '* b'], 1, ['* b', '- a']],
		['different delimiters travel with the item', ['1. a', '2) b'], 1, ['2) b', '1. a']],
		['bullet and ordered travel with the item', ['- a', '1. b'], 1, ['1. b', '- a']],
		[
			'wider number moves its children',
			['9. a', '   - x', '10. b'],
			2,
			['9. b', '10. a', '    - x'],
		],
		[
			'narrower number keeps its children',
			['10. a', '    - x', '9. b'],
			2,
			['10. b', '9. a', '    - x'],
		],
	])('%s', (_name, lines, lineIndex, expected) => {
		expect(movedUp(lines, lineIndex)).toEqual(expected);
	});

	it('keeps numbers in position when moving down', () => {
		expect(movedDown(['1. a', '2. b'], 0)).toEqual(['1. b', '2. a']);
	});
});
