import { describe, expect, it } from 'vitest';
import {
	closingParensAfter,
	itemTrigger,
	itemsOfNote,
	locateItem,
	searchItems,
	type IndexedItem,
} from '../../src/outline/item-search';

const item = (path: string, text: string): IndexedItem => ({ path, startLine: 0, text, id: null });

describe('itemsOfNote', () => {
	it('lists every item with its line, text and block id', () => {
		expect(itemsOfNote('n.md', '# T\n- a ^id1\n  - b\ntext', 4)).toEqual([
			{ path: 'n.md', startLine: 1, text: 'a', id: 'id1' },
			{ path: 'n.md', startLine: 2, text: 'b', id: null },
		]);
	});

	it('skips items without text', () => {
		expect(itemsOfNote('n.md', '- \n- a', 4).map((found) => found.text)).toEqual(['a']);
	});

	it('reads notes with Windows line endings', () => {
		expect(itemsOfNote('n.md', '- a\r\n- b', 4).map((found) => found.text)).toEqual(['a', 'b']);
	});

	it('lists nothing for a note without items', () => {
		expect(itemsOfNote('n.md', 'text', 4)).toEqual([]);
	});
});

describe('searchItems', () => {
	const items = [
		item('a.md', 'buy milk'),
		item('b.md', 'Milk run'),
		item('c.md', 'bread'),
		item('milk.md', 'cheese'),
	];

	it('puts items that start with the query before items that contain it', () => {
		expect(searchItems(items, 'milk', 10).map((found) => found.text)).toEqual([
			'Milk run',
			'buy milk',
			'cheese',
		]);
	});

	it('ignores case and surrounding spaces in the query', () => {
		expect(searchItems(items, '  BREAD ', 10).map((found) => found.text)).toEqual(['bread']);
	});

	it('returns the first items for an empty query', () => {
		expect(searchItems(items, '', 2).map((found) => found.text)).toEqual([
			'buy milk',
			'Milk run',
		]);
	});

	it('returns at most the limit', () => {
		expect(searchItems(items, 'milk', 1)).toHaveLength(1);
	});

	it('returns nothing when nothing matches', () => {
		expect(searchItems(items, 'zzz', 10)).toEqual([]);
	});
});

describe('itemTrigger', () => {
	it.each([
		['just opened', 'text ((', 5, ''],
		['with a query', '- see ((mil', 6, 'mil'],
		['with spaces in the query', '((buy mi', 0, 'buy mi'],
		['after a third paren', '(((a', 1, 'a'],
	])('finds the trigger when %s', (_name, prefix, start, query) => {
		expect(itemTrigger(prefix)).toEqual({ start, query });
	});

	it.each([
		['one paren', 'text (a'],
		['a closed pair', '((a))'],
		['a link', '[[a'],
		['plain text', 'hello'],
		['an empty line', ''],
	])('finds nothing for %s', (_name, prefix) => {
		expect(itemTrigger(prefix)).toBeNull();
	});
});

describe('closingParensAfter', () => {
	it.each([
		['two closing parens', '))', 2],
		['two closing parens and text', ')) rest', 2],
		['one closing paren', ') rest', 0],
		['text', 'rest', 0],
		['nothing', '', 0],
	])('counts %s', (_name, rest, expected) => {
		expect(closingParensAfter(rest)).toBe(expected);
	});
});

describe('locateItem', () => {
	const picked: IndexedItem = { path: 'n.md', startLine: 1, text: 'banana', id: null };

	it.each([
		['the item is still on its line', '- apple\n- banana\n- cherry', 1],
		['lines were added above it', '- new\n- new two\n- apple\n- banana', 3],
		['lines were removed above it', '- banana', 0],
		['it is the only item with that text after it moved', '- cherry\n- banana\n- apple', 1],
		['the note uses Windows line breaks', '- new\r\n- apple\r\n- banana', 2],
	])('finds the item when %s', (_name, text, expected) => {
		expect(locateItem(text, 4, picked)).toBe(expected);
	});

	it.each([
		['the item was removed', '- apple\n- cherry'],
		['the item text changed', '- apple\n- banana split'],
		['the note is empty', ''],
		[
			'two items now share its text and none is on its line',
			'- banana\n- apple\n- apple\n- banana',
		],
	])('gives up when %s', (_name, text) => {
		expect(locateItem(text, 4, picked)).toBeNull();
	});

	it('keeps the line of one of several equal items when it still holds the text', () => {
		expect(locateItem('- apple\n- banana\n- banana', 4, picked)).toBe(1);
	});
});
