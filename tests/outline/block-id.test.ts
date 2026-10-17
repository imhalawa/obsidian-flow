import { describe, expect, it } from 'vitest';
import { itemStartingAt } from '../../src/outline/item-lookup';
import {
	allBlockIds,
	blockIdSpans,
	duplicateBlockIds,
	idInsertion,
	idLineOf,
	newBlockId,
	readBlockId,
	stripBlockId,
} from '../../src/outline/block-id';
import { parseOutline } from '../../src/outline/outline-tree';

const itemAt = (lines: string[], startLine: number) => {
	const item = itemStartingAt(parseOutline(lines, 4), startLine);
	if (!item) throw new Error(`No item starts at line ${startLine}`);
	return item;
};

describe('idLineOf', () => {
	it.each([
		['a single line item', ['- a', '- b'], 0, 0],
		['an item with children', ['- a', '  - b'], 0, 0],
		['a multi line item', ['- a', '  more', '  - b'], 0, 1],
		['a multi line item without children', ['- a', '  more', '  and more'], 0, 2],
		['a nested multi line item', ['- a', '  - b', '    more', '  - c'], 1, 2],
		['an item whose second paragraph follows a blank line', ['- a', '', '  second'], 0, 0],
		['an item with a fenced block after the text', ['- a', '  ```', '  code', '  ```'], 0, 0],
		['the last item of a note', ['- a', '- b'], 1, 1],
	])('puts the id of %s on its own last text line', (_name, lines, startLine, expected) => {
		expect(idLineOf(lines, itemAt(lines, startLine))).toBe(expected);
	});
});

describe('readBlockId', () => {
	it.each([
		['a single line item', ['- a ^abc123'], 0, 'abc123'],
		['an id with a dash', ['- a ^a-b'], 0, 'a-b'],
		[
			'an id on the last text line of a multi line item',
			['- a', '  more ^x1', '  - b'],
			0,
			'x1',
		],
		['a nested item', ['- a', '  - b ^k9'], 1, 'k9'],
		['a task', ['- [ ] t ^t1'], 0, 't1'],
		['an ordered item', ['1. one ^o1'], 0, 'o1'],
	])('reads the id of %s', (_name, lines, startLine, expected) => {
		expect(readBlockId(lines, itemAt(lines, startLine))).toBe(expected);
	});

	it.each([
		['no id', ['- a'], 0],
		['an id on the first line of a multi line item', ['- a ^x1', '  more'], 0],
		['a caret that is not preceded by a space', ['- a^x1'], 0],
		['a caret in the middle', ['- a ^x1 b'], 0],
		['an id on a child only', ['- a', '  - b ^c1'], 0],
	])('finds nothing for %s', (_name, lines, startLine) => {
		expect(readBlockId(lines, itemAt(lines, startLine))).toBeNull();
	});
});

describe('allBlockIds and duplicateBlockIds', () => {
	const lines = ['- a ^one', '- b ^two', 'text ^one', '# head ^three', '- c', '- d ^one'];

	it('lists every id with repeats', () => {
		expect(allBlockIds(lines)).toEqual(['one', 'two', 'one', 'three', 'one']);
	});

	it('lists each repeated id once', () => {
		expect(duplicateBlockIds(lines)).toEqual(['one']);
	});

	it('finds no duplicates when every id is unique', () => {
		expect(duplicateBlockIds(['- a ^x', '- b ^y'])).toEqual([]);
		expect(duplicateBlockIds([])).toEqual([]);
	});
});

describe('newBlockId', () => {
	it('makes a six character base 36 id', () => {
		expect(newBlockId(new Set(), () => 0.5)).toBe('i00000');
	});

	it.each([
		[0, '000000'],
		[0.9999999999999999, 'zzzzzz'],
	])('pads and bounds the id for random value %s', (value, expected) => {
		expect(newBlockId(new Set(), () => value)).toBe(expected);
	});

	it('draws again while the id is taken', () => {
		const draws = [0, 0, 0.5];
		let call = 0;
		const id = newBlockId(new Set(['000000']), () => draws[call++] ?? 0.5);
		expect(id).toBe('i00000');
		expect(call).toBe(3);
	});
});

describe('idInsertion', () => {
	it('appends the id to the end of the line', () => {
		const lines = ['- a'];
		expect(idInsertion(lines, itemAt(lines, 0), 'x1')).toEqual({
			lineIndex: 0,
			from: 3,
			to: 3,
			insert: ' ^x1',
		});
	});

	it('replaces trailing spaces so the id follows the text directly', () => {
		const lines = ['- a   '];
		expect(idInsertion(lines, itemAt(lines, 0), 'x1')).toEqual({
			lineIndex: 0,
			from: 3,
			to: 6,
			insert: ' ^x1',
		});
	});

	it('targets the last text line of a multi line item', () => {
		const lines = ['- a', '  more', '  - b'];
		expect(idInsertion(lines, itemAt(lines, 0), 'x1')).toMatchObject({ lineIndex: 1, from: 6 });
	});
});

const spansOf = (lines: string[]) => blockIdSpans(lines, parseOutline(lines, 4));

describe('blockIdSpans', () => {
	it('returns the span of each trailing id including the space before it', () => {
		const lines = ['- a ^one', '  - b', '  - c ^two', '', 'text ^no'];
		expect(spansOf(lines)).toEqual([
			{ lineIndex: 0, from: 3, to: 8 },
			{ lineIndex: 2, from: 5, to: 10 },
		]);
	});

	it('finds the id on the last text line of a multi line item', () => {
		expect(spansOf(['- a', '  more ^x1'])).toEqual([{ lineIndex: 1, from: 6, to: 10 }]);
	});

	it('ignores an id on the first line of a multi line item', () => {
		expect(spansOf(['- a ^x1', '  more'])).toEqual([]);
	});

	it('finds nothing in a note without items', () => {
		expect(spansOf(['text ^x1'])).toEqual([]);
		expect(spansOf([])).toEqual([]);
	});
});

describe('stripBlockId', () => {
	it.each([
		['a trailing id', 'a ^abc123', 'a'],
		['text without an id', 'a', 'a'],
		['a caret inside the text', 'a ^b c', 'a ^b c'],
		['only an id', ' ^abc123', ''],
	])('handles %s', (_name, text, expected) => {
		expect(stripBlockId(text)).toBe(expected);
	});
});
