import { describe, expect, it } from 'vitest';
import {
	EMPTY_STORE,
	forgetZoom,
	parseStore,
	rememberZoom,
	renameZoom,
	type ZoomStore,
} from '../../src/outline/zoom-store';

const anchor = (text: string) => [{ text, nth: 0 }];
const entry = (text: string, usedAt: number) => ({ anchor: anchor(text), usedAt });

const store: ZoomStore = {
	'a.md': entry('a', 10),
	'folder/b.md': entry('b', 20),
	'folder/sub/c.md': entry('c', 30),
	'folderish.md': entry('d', 40),
};

describe('rememberZoom', () => {
	it('adds a note', () => {
		const next = rememberZoom(EMPTY_STORE, 'a.md', anchor('a'), 5, 10);
		expect(next).toEqual({ 'a.md': entry('a', 5) });
	});

	it('replaces the zoom of a note that is already there', () => {
		const next = rememberZoom(store, 'a.md', anchor('z'), 99, 10);
		expect(next['a.md']).toEqual(entry('z', 99));
		expect(Object.keys(next)).toHaveLength(4);
	});

	it('leaves the old store untouched', () => {
		rememberZoom(store, 'new.md', anchor('n'), 99, 10);
		expect(Object.keys(store)).toHaveLength(4);
	});

	it('drops the least recently used notes beyond the limit', () => {
		const next = rememberZoom(store, 'new.md', anchor('n'), 50, 3);
		expect(Object.keys(next).sort()).toEqual(['folder/sub/c.md', 'folderish.md', 'new.md']);
	});

	it('keeps exactly the limit', () => {
		expect(Object.keys(rememberZoom(store, 'new.md', anchor('n'), 50, 5))).toHaveLength(5);
	});

	it('keeps a note under a name that is also an object key', () => {
		const next = rememberZoom(EMPTY_STORE, '__proto__', anchor('p'), 1, 10);
		expect(Object.keys(next)).toEqual(['__proto__']);
	});
});

describe('forgetZoom', () => {
	it('removes one note', () => {
		expect(Object.keys(forgetZoom(store, 'a.md')).sort()).toEqual([
			'folder/b.md',
			'folder/sub/c.md',
			'folderish.md',
		]);
	});

	it('removes every note inside a deleted folder but not look-alike names', () => {
		expect(Object.keys(forgetZoom(store, 'folder')).sort()).toEqual(['a.md', 'folderish.md']);
	});

	it('ignores a path that is not stored', () => {
		expect(forgetZoom(store, 'none.md')).toEqual(store);
	});
});

describe('renameZoom', () => {
	it('moves one note to its new path', () => {
		const next = renameZoom(store, 'a.md', 'renamed.md');
		expect(next['renamed.md']).toEqual(store['a.md']);
		expect(next['a.md']).toBeUndefined();
	});

	it('moves every note inside a renamed folder but not look-alike names', () => {
		const next = renameZoom(store, 'folder', 'moved');
		expect(Object.keys(next).sort()).toEqual([
			'a.md',
			'folderish.md',
			'moved/b.md',
			'moved/sub/c.md',
		]);
	});

	it('ignores a path that is not stored', () => {
		expect(renameZoom(store, 'none.md', 'x.md')).toEqual(store);
	});
});

describe('parseStore', () => {
	it('reads back what was stored', () => {
		expect(parseStore(JSON.parse(JSON.stringify(store)))).toEqual(store);
	});

	it.each([null, undefined, 'text', 5, true, []])('reads %s as an empty store', (raw) => {
		expect(parseStore(raw)).toEqual({});
	});

	it.each([
		['a missing anchor', { usedAt: 1 }],
		['an empty anchor', { anchor: [], usedAt: 1 }],
		['an anchor that is not a list', { anchor: 'a', usedAt: 1 }],
		['a missing time', { anchor: anchor('a') }],
		['a time that is not a number', { anchor: anchor('a'), usedAt: '1' }],
		['a segment without text', { anchor: [{ nth: 0 }], usedAt: 1 }],
		['a segment with a number as text', { anchor: [{ text: 5, nth: 0 }], usedAt: 1 }],
		['a segment without a position', { anchor: [{ text: 'a' }], usedAt: 1 }],
		['a negative position', { anchor: [{ text: 'a', nth: -1 }], usedAt: 1 }],
		['a fractional position', { anchor: [{ text: 'a', nth: 0.5 }], usedAt: 1 }],
		['a segment that is null', { anchor: [null], usedAt: 1 }],
		['one bad segment among good ones', { anchor: [{ text: 'a', nth: 0 }, null], usedAt: 1 }],
		['an entry that is null', null],
		['an entry that is a string', 'x'],
	])('drops an entry with %s and keeps the good ones', (_name, bad) => {
		expect(parseStore({ 'bad.md': bad, 'good.md': entry('g', 1) })).toEqual({
			'good.md': entry('g', 1),
		});
	});
});
