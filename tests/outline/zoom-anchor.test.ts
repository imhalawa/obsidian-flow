import { describe, expect, it } from 'vitest';
import { makeAnchor, resolveAnchor } from '../../src/outline/zoom-anchor';

const BASE = ['- A', '\t- B', '\t\t- C', '\t- D', '- E', '\t- B', '\t\t- X'];
const ANCHOR_OF_C = [
	{ text: 'A', nth: 0 },
	{ text: 'B', nth: 0 },
	{ text: 'C', nth: 0 },
];

const resolveInto = (lines: string[], anchor = ANCHOR_OF_C) => resolveAnchor(lines, 4, anchor);

describe('makeAnchor', () => {
	it('describes an item by the texts on its path', () => {
		expect(makeAnchor(BASE, 4, 2)).toEqual(ANCHOR_OF_C);
	});

	it('describes a top level item by itself', () => {
		expect(makeAnchor(BASE, 4, 4)).toEqual([{ text: 'E', nth: 0 }]);
	});

	it('gives equal siblings under different parents their own path', () => {
		expect(makeAnchor(BASE, 4, 5)).toEqual([
			{ text: 'E', nth: 0 },
			{ text: 'B', nth: 0 },
		]);
	});

	it('numbers equal siblings under one parent', () => {
		const lines = ['- T', '- T', '\t- k'];
		expect(makeAnchor(lines, 4, 1)).toEqual([{ text: 'T', nth: 1 }]);
		expect(makeAnchor(lines, 4, 2)).toEqual([
			{ text: 'T', nth: 1 },
			{ text: 'k', nth: 0 },
		]);
	});

	it('ignores a block id at the end of the text', () => {
		expect(makeAnchor(['- a ^abc123'], 4, 0)).toEqual([{ text: 'a', nth: 0 }]);
	});

	it.each([
		['a line without an item', ['text', '- a'], 0],
		['a line past the end', ['- a'], 5],
	])('returns null for %s', (_name, lines, line) => {
		expect(makeAnchor(lines, 4, line)).toBeNull();
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
		expect(resolveAnchor(BASE, 4, [])).toBeNull();
		expect(resolveInto([''])).toBeNull();
	});

	it('tells equal siblings apart by their position', () => {
		const lines = ['- T', '- T', '\t- k'];
		const anchor = makeAnchor(lines, 4, 2);
		expect(anchor && resolveAnchor(lines, 4, anchor)).toBe(2);
	});

	it('uses the last equal sibling when fewer remain', () => {
		const anchor = makeAnchor(['- T', '- T', '- T'], 4, 2);
		expect(anchor && resolveAnchor(['- T', '- T'], 4, anchor)).toBe(1);
	});

	it('ignores a block id when matching', () => {
		const anchor = makeAnchor(['- a'], 4, 0);
		expect(anchor && resolveAnchor(['- a ^id1'], 4, anchor)).toBe(0);
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
		expect(makeAnchor([line], 4, 0)).toEqual([{ text: expected, nth: 0 }]);
	});
});

describe('anchors with headings', () => {
	const NOTE = ['# A', '- x', '## B', '- y', '\t- z', '# A', '- y'];

	it('puts the headings above an item in front of its path', () => {
		expect(makeAnchor(NOTE, 4, 4)).toEqual([
			{ text: 'A', nth: 0, heading: true },
			{ text: 'B', nth: 0, heading: true },
			{ text: 'y', nth: 0 },
			{ text: 'z', nth: 0 },
		]);
	});

	it('describes a heading by the headings above it', () => {
		expect(makeAnchor(NOTE, 4, 2)).toEqual([
			{ text: 'A', nth: 0, heading: true },
			{ text: 'B', nth: 0, heading: true },
		]);
	});

	it('numbers equal headings among those with the same parent', () => {
		expect(makeAnchor(NOTE, 4, 5)).toEqual([{ text: 'A', nth: 1, heading: true }]);
	});

	it('finds an item under the right one of two equal headings', () => {
		const anchor = makeAnchor(NOTE, 4, 6);
		expect(anchor && resolveAnchor(NOTE, 4, anchor)).toBe(6);
	});

	it('finds a heading again after lines are inserted above', () => {
		const anchor = makeAnchor(NOTE, 4, 2);
		expect(anchor && resolveAnchor(['new', ...NOTE], 4, anchor)).toBe(3);
	});

	it('falls back to the deepest heading that still matches', () => {
		const anchor = makeAnchor(NOTE, 4, 4);
		const edited = ['# A', '- x', '## renamed', '- y', '\t- z'];
		expect(anchor && resolveAnchor(edited, 4, anchor)).toBe(0);
	});

	it('does not match an item that moved under another heading', () => {
		const anchor = makeAnchor(NOTE, 4, 3);
		const moved = ['# A', '## B', '# C', '- y'];
		expect(anchor && resolveAnchor(moved, 4, anchor)).toBe(1);
	});

	it('still reads an anchor stored before headings were zoomable', () => {
		expect(resolveAnchor(NOTE, 4, [{ text: 'y', nth: 0 }])).toBe(3);
	});

	it.each([
		['the first item', 1],
		['the equal item under the second heading', 3],
		['the second equal item under the second heading', 4],
	])('finds %s again from its own anchor', (_name, line) => {
		const lines = ['# A', '- x', '# B', '- x', '- x'];
		const anchor = makeAnchor(lines, 4, line);
		expect(anchor && resolveAnchor(lines, 4, anchor)).toBe(line);
	});

	it('numbers an item among the equal items of its own heading only', () => {
		expect(makeAnchor(['# A', '- x', '# B', '- x', '- x'], 4, 4)).toEqual([
			{ text: 'B', nth: 0, heading: true },
			{ text: 'x', nth: 1 },
		]);
	});

	it('does not match an item that moved under a nested heading', () => {
		const anchor = makeAnchor(['# A', '- x'], 4, 1);
		expect(anchor && resolveAnchor(['# A', '## B', '- x'], 4, anchor)).toBe(0);
	});
});
