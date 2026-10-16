import { EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import {
	cleanZoomDecorations,
	zoomedLevels,
	ZOOM_LEVELS_PROPERTY,
	ZOOM_LINE_CLASS,
} from '../../src/editor/clean-zoom-decorations';
import { zoomChange, zoomField } from '../../src/editor/zoom-field';

const NOTE = ['# T', '- a', '\t- b', '\t\t- c', '\t\t\t- d', '\t\t- e', '- f'].join('\n');

const zoomedOn = (startLine: number | null) =>
	EditorState.create({ doc: NOTE, extensions: [zoomField] }).update({
		effects: zoomChange.of({ startLine, navigation: 'visit' }),
	}).state;

const decorated = (state: EditorState) => {
	const found: { line: number; className: string; style: string }[] = [];
	const set: DecorationSet = cleanZoomDecorations(state);
	set.between(0, state.doc.length, (from, _to, decoration) => {
		const spec = decoration.spec as { class: string; attributes: { style: string } };
		found.push({
			line: state.doc.lineAt(from).number - 1,
			className: spec.class,
			style: spec.attributes.style,
		});
	});
	return found;
};

const levels = (count: number) => `${ZOOM_LEVELS_PROPERTY}: ${count}`;

describe('cleanZoomDecorations', () => {
	it('marks every line of the zoomed item with the number of hidden levels', () => {
		expect(decorated(zoomedOn(3))).toEqual([
			{ line: 3, className: ZOOM_LINE_CLASS, style: levels(2) },
			{ line: 4, className: ZOOM_LINE_CLASS, style: levels(2) },
		]);
	});

	it('counts one level for an item one level in', () => {
		expect(decorated(zoomedOn(2)).map((entry) => [entry.line, entry.style])).toEqual([
			[2, levels(1)],
			[3, levels(1)],
			[4, levels(1)],
			[5, levels(1)],
		]);
	});

	it.each([
		['a top level item', 1],
		['a heading', 0],
		['no zoom', null],
	])('marks nothing for %s', (_name, startLine) => {
		expect(decorated(zoomedOn(startLine))).toEqual([]);
	});
});

describe('zoomedLevels', () => {
	it.each([
		[3, 2],
		[2, 1],
		[1, 0],
	])('counts the levels the item on line %i moves', (startLine, expected) => {
		expect(zoomedLevels(zoomedOn(startLine))).toBe(expected);
	});

	it('is 0 for a heading', () => {
		expect(zoomedLevels(zoomedOn(0))).toBe(0);
	});

	it('is 0 when the note is not zoomed', () => {
		expect(zoomedLevels(zoomedOn(null))).toBe(0);
	});

	it('is 0 without the zoom field', () => {
		expect(zoomedLevels(EditorState.create({ doc: NOTE }))).toBe(0);
	});
});
