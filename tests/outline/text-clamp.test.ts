import { describe, expect, it } from 'vitest';
import { itemStartingAt } from '../../src/outline/item-lookup';
import { parseOutline } from '../../src/outline/outline-tree';
import { clampToItemText, isAtItemTextStart } from '../../src/outline/text-clamp';

const clamp = (lines: string[], line: number, column: number) =>
	clampToItemText(lines[line] ?? '', itemStartingAt(parseOutline(lines, 4), line), column);

describe('clampToItemText', () => {
	it.each([
		['the very start of a bullet line', ['- a'], 0, 0, 2],
		['between the marker and its space', ['- a'], 0, 1, 2],
		['the start of an indented bullet', ['- p', '	- a'], 1, 0, 3],
		['inside the indent of a bullet', ['- p', '	- q', '		- a'], 2, 1, 4],
		['inside an ordered marker', ['1. a'], 0, 1, 3],
		['inside a task marker', ['- [ ] a'], 0, 3, 6],
		['an empty bullet at its start', ['- '], 0, 0, 2],
	])('moves %s to the start of the text', (_name, lines, line, column, expected) => {
		expect(clamp(lines, line, column)).toBe(expected);
	});

	it.each([
		['the start of the text', ['- a'], 0, 2],
		['inside the text', ['- abc'], 0, 4],
		['the end of the text', ['- abc'], 0, 5],
		['the start of the text of a task', ['- [x] a'], 0, 6],
	])('keeps %s where it is', (_name, lines, line, column) => {
		expect(clamp(lines, line, column)).toBe(column);
	});

	it.each([
		['a line that is not a list item', ['text', '- a'], 0, 0],
		['a continuation line of an item', ['- a', '  more'], 1, 0],
		['a blank line', ['- a', '', '- b'], 1, 0],
	])('leaves %s alone', (_name, lines, line, column) => {
		expect(clamp(lines, line, column)).toBe(column);
	});
});

describe('isAtItemTextStart', () => {
	const at = (lines: string[], line: number, column: number) =>
		isAtItemTextStart(lines[line] ?? '', itemStartingAt(parseOutline(lines, 4), line), column);

	it.each([
		['the start of the text of a bullet', ['- a'], 0, 2, true],
		['the start of the text of a task', ['- [ ] a'], 0, 6, true],
		['inside the text', ['- abc'], 0, 3, false],
		['inside the marker', ['- a'], 0, 1, false],
		['a line that is not a list item', ['text'], 0, 0, false],
	])('tells for %s', (_name, lines, line, column, expected) => {
		expect(at(lines, line, column)).toBe(expected);
	});
});
