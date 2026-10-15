import { describe, expect, it } from 'vitest';
import { makeAnchor, resolveAnchor } from '../../src/outline/zoom-anchor';
import { parseOutline } from '../../src/outline/outline-tree';

const tree = (lines: string[]) => parseOutline(lines, 4);

const BASE = ['- A', '\t- B', '\t\t- C', '\t- D', '- E', '\t- B', '\t\t- X'];
const ANCHOR_OF_C = [
	{ text: 'A', nth: 0 },
	{ text: 'B', nth: 0 },
	{ text: 'C', nth: 0 },
];

const resolveInto = (lines: string[], anchor = ANCHOR_OF_C) => resolveAnchor(tree(lines), anchor);

describe('makeAnchor', () => {
	it('describes an item by the texts on its path', () => {
		expect(makeAnchor(tree(BASE), 2)).toEqual(ANCHOR_OF_C);
	});

	it('describes a top level item by itself', () => {
		expect(makeAnchor(tree(BASE), 4)).toEqual([{ text: 'E', nth: 0 }]);
	});

	it('gives equal siblings under different parents their own path', () => {
		expect(makeAnchor(tree(BASE), 5)).toEqual([
			{ text: 'E', nth: 0 },
			{ text: 'B', nth: 0 },
		]);
	});

	it('numbers equal siblings under one parent', () => {
		const lines = ['- T', '- T', '\t- k'];
		expect(makeAnchor(tree(lines), 1)).toEqual([{ text: 'T', nth: 1 }]);
		expect(makeAnchor(tree(lines), 2)).toEqual([
			{ text: 'T', nth: 1 },
			{ text: 'k', nth: 0 },
		]);
	});

	it('ignores a block id at the end of the text', () => {
		expect(makeAnchor(tree(['- a ^abc123']), 0)).toEqual([{ text: 'a', nth: 0 }]);
	});

	it.each([
		['a line without an item', ['text', '- a'], 0],
		['a line past the end', ['- a'], 5],
	])('returns null for %s', (_name, lines, line) => {
		expect(makeAnchor(tree(lines), line)).toBeNull();
	});
});

describe('resolveAnchor', () => {
	it.each([
		['the note is unchanged', BASE, 2],
		['lines are inserted above', ['- new', ...BASE], 3],
		[
			'a sibling is added before the parent of the item',
			['- A', '\t- B0', ...BASE.slice(1)],
			3,
		],
		[
			'the whole branch moves down',
			['- E', '\t- B', '\t\t- X', '- A', '\t- B', '\t\t- C', '\t- D'],
			5,
		],
	])('finds the item when %s', (_name, lines, expected) => {
		expect(resolveInto(lines)).toBe(expected);
	});

	it.each([
		['the item text was edited', ['- A', '\t- B', '\t\t- C edited'], 1],
		['the item was deleted', ['- A', '\t- B', '\t- D'], 1],
		['the item moved under another parent', ['- A', '- Q', '\t- B', '\t\t- C'], 0],
	])('falls back to the deepest matching ancestor when %s', (_name, lines, expected) => {
		expect(resolveInto(lines)).toBe(expected);
	});

	it('finds nothing when the whole branch is gone', () => {
		expect(resolveInto(['- Z'])).toBeNull();
	});

	it('finds nothing for an empty anchor or an empty note', () => {
		expect(resolveAnchor(tree(BASE), [])).toBeNull();
		expect(resolveInto([''])).toBeNull();
	});

	it('tells equal siblings apart by their position', () => {
		const lines = ['- T', '- T', '\t- k'];
		const anchor = makeAnchor(tree(lines), 2);
		expect(anchor && resolveAnchor(tree(lines), anchor)).toBe(2);
	});

	it('uses the last equal sibling when fewer remain', () => {
		const anchor = makeAnchor(tree(['- T', '- T', '- T']), 2);
		expect(anchor && resolveAnchor(tree(['- T', '- T']), anchor)).toBe(1);
	});

	it('ignores a block id when matching', () => {
		const anchor = makeAnchor(tree(['- a']), 0);
		expect(anchor && resolveAnchor(tree(['- a ^id1']), anchor)).toBe(0);
	});
});

describe('anchor text', () => {
	it.each([
		['a block id', '- a ^abc-12', 'a'],
		['a block id after extra spaces', '- a   ^abc', 'a'],
		['a caret in the middle of the text', '- a ^x b', 'a ^x b'],
		['a caret without a space before it', '- a^abc', 'a^abc'],
		['trailing spaces', '- a   ', 'a'],
	])('handles %s', (_name, line, expected) => {
		expect(makeAnchor(tree([line]), 0)).toEqual([{ text: expected, nth: 0 }]);
	});
});
