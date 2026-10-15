import { describe, expect, it } from 'vitest';
import { backspaceAtItemStart } from '../../src/outline/backspace-key';

describe('backspaceAtItemStart', () => {
	it('merges an item into the item above and puts the caret at the join', () => {
		expect(backspaceAtItemStart(['- one', '- two'], 4, 1, 2)).toEqual({
			fromLine: 0,
			toLine: 1,
			text: '- onetwo',
			caret: 5,
		});
	});

	it('merges a nested item into its parent', () => {
		expect(backspaceAtItemStart(['- one', '\t- two'], 4, 1, 3)).toEqual({
			fromLine: 0,
			toLine: 1,
			text: '- onetwo',
			caret: 5,
		});
	});

	it('merges into the last visible line above, which can be a deeper item', () => {
		expect(backspaceAtItemStart(['- a', '  - b', '- c'], 4, 2, 2)).toEqual({
			fromLine: 1,
			toLine: 2,
			text: '  - bc',
			caret: 5,
		});
	});

	it('removes an empty item and puts the caret at the end of the item above', () => {
		expect(backspaceAtItemStart(['- one', '- '], 4, 1, 2)).toEqual({
			fromLine: 0,
			toLine: 1,
			text: '- one',
			caret: 5,
		});
	});

	it('moves the text of a task without its checkbox', () => {
		expect(backspaceAtItemStart(['- one', '- [ ] two'], 4, 1, 6)).toMatchObject({
			text: '- onetwo',
		});
	});

	it.each([
		['the caret is before the text start', ['- a', '- b'], 1, 1],
		['the caret is inside the text', ['- a', '- bc'], 1, 3],
		['the caret is before the checkbox', ['- a', '- [ ] b'], 1, 2],
		['there is no item above', ['- a'], 0, 2],
		['the line above is not an item', ['text', '- a'], 1, 2],
		['the line above continues an item', ['- a', '  more', '- b'], 2, 2],
		['the line is not an item', ['- a', 'text'], 1, 0],
		['the line does not exist', ['- a'], 5, 0],
		['the line only looks like an item', ['text', '    - a'], 1, 6],
	])('does nothing when %s', (_name, lines, line, column) => {
		expect(backspaceAtItemStart(lines, 4, line, column)).toBeNull();
	});

	it('does nothing for an item with children', () => {
		expect(backspaceAtItemStart(['- a', '- b', '  - c'], 4, 1, 2)).toBeNull();
	});

	it('does nothing for an item with more than one line', () => {
		expect(backspaceAtItemStart(['- a', '- b', '  more'], 4, 1, 2)).toBeNull();
	});

	it('does nothing when the item above is separated by a blank line', () => {
		expect(backspaceAtItemStart(['- a', '', '- b'], 4, 2, 2)).toBeNull();
	});
});
