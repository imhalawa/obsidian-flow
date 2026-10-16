import { describe, expect, it } from 'vitest';
import { ownLastLine, textStartColumn } from '../../src/outline/item-text';
import { parseOutline } from '../../src/outline/outline-tree';

describe('textStartColumn', () => {
	it.each([
		[['- text'], 0, 2],
		[['- p', '\t* text'], 1, 3],
		[['12. text'], 0, 4],
		[['- [ ] task'], 0, 6],
		[['- [x]   task'], 0, 8],
		[['-   text'], 0, 4],
		[['- '], 0, 2],
		[['- [ ] '], 0, 6],
	])('finds the text of %j item %i at column %i', (lines, index, column) => {
		const item = parseOutline(lines, 4).nodes[index];
		if (!item) throw new Error('no such item');
		expect(textStartColumn(lines, item)).toBe(column);
	});
});

describe('ownLastLine', () => {
	const lastOf = (lines: string[], index: number) => {
		const node = parseOutline(lines, 4).nodes[index];
		if (!node) throw new Error('no such item');
		return ownLastLine(lines, node);
	};

	it('is the first line of a single line item', () => {
		expect(lastOf(['- a'], 0)).toBe(0);
	});

	it('includes continuation lines', () => {
		expect(lastOf(['- a', '  more', '  and more'], 0)).toBe(2);
	});

	it('stops before the first child', () => {
		expect(lastOf(['- a', '  more', '  - b', '  - c'], 0)).toBe(1);
	});

	it('leaves out blank lines after the item', () => {
		expect(lastOf(['- a', '', '', '- b'], 0)).toBe(0);
	});

	it('leaves out blank lines between the item text and its first child', () => {
		expect(lastOf(['- a', '  more', '', '  - b'], 0)).toBe(1);
	});

	it('treats a line of spaces as blank', () => {
		expect(lastOf(['- a', '   ', '- b'], 0)).toBe(0);
	});

	it('keeps a blank line inside continuation text', () => {
		expect(lastOf(['- a', '', '  more', '- b'], 0)).toBe(2);
	});
});
