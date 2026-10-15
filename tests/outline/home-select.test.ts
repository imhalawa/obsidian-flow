import { describe, expect, it } from 'vitest';
import { homeColumn, itemTextRange } from '../../src/outline/home-select';

describe('homeColumn', () => {
	it.each([
		['after the text start', ['- abc'], 0, 4, 2],
		['at the end of the line', ['- a', '\t- abc'], 1, 6, 3],
		['in a task, after the checkbox', ['- [ ] abc'], 0, 9, 6],
	])('moves to the text start when the caret is %s', (_name, lines, line, column, expected) => {
		expect(homeColumn(lines, 4, line, column)).toBe(expected);
	});

	it.each([
		['already at the text start', ['- abc'], 0, 2],
		['inside the marker', ['- abc'], 0, 1],
		['in the indent', ['\t- abc'], 0, 0],
		['on a continuation line', ['- abc', '  def'], 1, 4],
		['outside an item', ['abc'], 0, 2],
		['on a line that does not exist', ['- abc'], 4, 2],
	])('does nothing when the caret is %s', (_name, lines, line, column) => {
		expect(homeColumn(lines, 4, line, column)).toBeNull();
	});
});

describe('itemTextRange', () => {
	it('covers the text of a single line item', () => {
		expect(itemTextRange(['- abc'], 4, 0)).toEqual({
			from: { line: 0, column: 2 },
			to: { line: 0, column: 5 },
		});
	});

	it('covers continuation lines', () => {
		expect(itemTextRange(['- abc', '  def'], 4, 1)).toEqual({
			from: { line: 0, column: 2 },
			to: { line: 1, column: 5 },
		});
	});

	it('leaves out the children', () => {
		expect(itemTextRange(['- abc', '  - def'], 4, 0)).toEqual({
			from: { line: 0, column: 2 },
			to: { line: 0, column: 5 },
		});
	});

	it('covers the child when the caret is in the child', () => {
		expect(itemTextRange(['- abc', '  - def'], 4, 1)).toEqual({
			from: { line: 1, column: 4 },
			to: { line: 1, column: 7 },
		});
	});

	it('starts after the checkbox of a task', () => {
		expect(itemTextRange(['- [ ] abc'], 4, 0)).toMatchObject({ from: { column: 6 } });
	});

	it('is null outside an item', () => {
		expect(itemTextRange(['abc'], 4, 0)).toBeNull();
	});

	it('is null on a blank line after the item text', () => {
		expect(itemTextRange(['- abc', '', '- def'], 4, 1)).toBeNull();
	});
});
