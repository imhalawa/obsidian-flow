import { describe, expect, it } from 'vitest';
import { resolveZoom, zoomInTarget, zoomOutStart } from '../../src/outline/zoom-view';

const lines = ['# Title', '- a', '  - b', '    - c', '  - d', '- e', '', 'text'];

describe('resolveZoom', () => {
	it('returns the range and the path of the item that starts on the line', () => {
		expect(resolveZoom(lines, 4, 3)).toEqual({
			range: { fromLine: 3, toLine: 3 },
			crumbs: [
				{ text: 'Title', startLine: 0 },
				{ text: 'a', startLine: 1 },
				{ text: 'b', startLine: 2 },
				{ text: 'c', startLine: 3 },
			],
		});
	});

	it('covers the whole subtree of a parent', () => {
		expect(resolveZoom(lines, 4, 1)?.range).toEqual({ fromLine: 1, toLine: 4 });
	});

	it.each([
		['a continuation line of nothing', 6],
		['a paragraph', 7],
		['a line past the end', 99],
		['a negative line', -1],
	])('returns null for %s', (_name, startLine) => {
		expect(resolveZoom(lines, 4, startLine)).toBeNull();
	});

	it('returns null for an empty note', () => {
		expect(resolveZoom([''], 4, 0)).toBeNull();
	});

	it('covers a heading and everything under it', () => {
		expect(resolveZoom(lines, 4, 0)).toEqual({
			range: { fromLine: 0, toLine: 7 },
			crumbs: [{ text: 'Title', startLine: 0 }],
		});
	});

	it('stops a heading section before the next heading of the same level', () => {
		const note = ['# a', 'x', '## b', 'y', '# c', 'z'];
		expect(resolveZoom(note, 4, 2)).toEqual({
			range: { fromLine: 2, toLine: 3 },
			crumbs: [
				{ text: 'a', startLine: 0 },
				{ text: 'b', startLine: 2 },
			],
		});
	});

	it('puts the headings above an item in front of its path', () => {
		const note = ['# a', '## b', '- x', '  - y'];
		expect(resolveZoom(note, 4, 3)?.crumbs).toEqual([
			{ text: 'a', startLine: 0 },
			{ text: 'b', startLine: 1 },
			{ text: 'x', startLine: 2 },
			{ text: 'y', startLine: 3 },
		]);
	});

	it('does not add headings that end before the item', () => {
		const note = ['# a', 'x', '# b', '- y'];
		expect(resolveZoom(note, 4, 3)?.crumbs).toEqual([
			{ text: 'b', startLine: 2 },
			{ text: 'y', startLine: 3 },
		]);
	});
});

describe('zoomInTarget', () => {
	it.each([
		['the item line itself', 2, 2],
		['a nested item', 3, 3],
		['a parent line', 1, 1],
		['a continuation line of an item', 4, 4],
	])('picks the deepest item at %s', (_name, cursorLine, expected) => {
		expect(zoomInTarget(lines, 4, cursorLine)).toBe(expected);
	});

	it.each([
		['a heading line', 0, 0],
		['a paragraph under a heading', 7, 0],
		['a blank line under a heading', 6, 0],
	])('picks the heading section at %s', (_name, cursorLine, expected) => {
		expect(zoomInTarget(lines, 4, cursorLine)).toBe(expected);
	});

	it('picks the innermost heading section', () => {
		const note = ['# a', '## b', 'text', '# c'];
		expect(zoomInTarget(note, 4, 2)).toBe(1);
	});

	it('prefers an item over the heading it sits under', () => {
		expect(zoomInTarget(['# a', '- x'], 4, 1)).toBe(1);
	});

	it.each([
		['a paragraph before any heading', ['text', '# a'], 0],
		['a blank line after the last section', ['# a', 'x', '', '', '# b'], 3],
	])('picks nothing on %s', (_name, note, cursorLine) => {
		expect(zoomInTarget(note, 4, cursorLine)).toBeNull();
	});
});

describe('zoomOutStart', () => {
	it.each([
		['a nested item to its parent', 3, 2],
		['a second level item to its top item', 2, 1],
	])('moves %s', (_name, startLine, expected) => {
		expect(zoomOutStart(lines, 4, startLine)).toBe(expected);
	});

	it('moves a top level item under a heading to that heading', () => {
		expect(zoomOutStart(lines, 4, 1)).toBe(0);
	});

	it('moves a top level item without a heading to the whole note', () => {
		expect(zoomOutStart(['- a', '- b'], 4, 1)).toBeNull();
	});

	it('moves a nested heading to its parent heading', () => {
		expect(zoomOutStart(['# a', '## b', '### c'], 4, 2)).toBe(1);
	});

	it('moves a top heading to the whole note', () => {
		expect(zoomOutStart(['# a', '## b'], 4, 0)).toBeNull();
	});

	it('moves an unknown item to the whole note', () => {
		expect(zoomOutStart(lines, 4, 7)).toBeNull();
	});
});
