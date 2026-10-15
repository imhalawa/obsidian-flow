import { describe, expect, it } from 'vitest';
import { ownLastLine, textStartColumn } from '../../src/outline/item-text';
import { parseOutline } from '../../src/outline/outline-tree';

describe('textStartColumn', () => {
	it.each([
		['- text', 2],
		['\t* text', 3],
		['12. text', 4],
		['- [ ] task', 6],
		['- [x]   task', 8],
		['-   text', 4],
		['- ', 2],
		['- [ ] ', 6],
	])('finds the text of %j at column %i', (line, column) => {
		expect(textStartColumn(line)).toBe(column);
	});

	it.each([[''], ['plain text'], ['-text'], ['> - quote']])(
		'returns null for %j, which is not an item',
		(line) => {
			expect(textStartColumn(line)).toBeNull();
		},
	);
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

	it('keeps a blank line inside continuation text', () => {
		expect(lastOf(['- a', '', '  more', '- b'], 0)).toBe(2);
	});
});
