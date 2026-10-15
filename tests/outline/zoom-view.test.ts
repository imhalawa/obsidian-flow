import { describe, expect, it } from 'vitest';
import { resolveZoom, zoomInTarget, zoomOutStart } from '../../src/outline/zoom-view';

const lines = ['# Title', '- a', '  - b', '    - c', '  - d', '- e', '', 'text'];

describe('resolveZoom', () => {
	it('returns the range and the path of the item that starts on the line', () => {
		expect(resolveZoom(lines, 4, 3)).toEqual({
			range: { fromLine: 3, toLine: 3 },
			crumbs: [
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
		['a heading', 0],
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
		['a heading', 0],
		['a blank line', 6],
		['a paragraph', 7],
	])('picks nothing on %s', (_name, cursorLine) => {
		expect(zoomInTarget(lines, 4, cursorLine)).toBeNull();
	});
});

describe('zoomOutStart', () => {
	it.each([
		['a nested item to its parent', 3, 2],
		['a second level item to its top item', 2, 1],
	])('moves %s', (_name, startLine, expected) => {
		expect(zoomOutStart(lines, 4, startLine)).toBe(expected);
	});

	it('moves a top level item to the whole note', () => {
		expect(zoomOutStart(lines, 4, 1)).toBeNull();
	});

	it('moves an unknown item to the whole note', () => {
		expect(zoomOutStart(lines, 4, 7)).toBeNull();
	});
});
