import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import {
	cleanZoomDecorations,
	HIDDEN_INDENT_CLASS,
	ZOOM_LINE_CLASS,
} from '../../src/editor/clean-zoom-decorations';
import { zoomChange, zoomField } from '../../src/editor/zoom-field';

const NOTE = ['# T', '- a', '\t- b', '\t\t- c', '\t\t\t- d', '\t\t- e', '- f'].join('\n');

const zoomedOn = (doc: string, startLine: number | null) =>
	EditorState.create({ doc, extensions: [zoomField] }).update({
		effects: zoomChange.of({ startLine, navigation: 'visit' }),
	}).state;

const decorationsOf = (state: EditorState) => {
	const found: { line: number; length: number; className: string }[] = [];
	cleanZoomDecorations(state).between(0, state.doc.length, (from, to, decoration) => {
		found.push({
			line: state.doc.lineAt(from).number - 1,
			length: to - from,
			className: (decoration.spec as { class: string }).class,
		});
	});
	return found;
};

const markedLines = (state: EditorState) =>
	decorationsOf(state)
		.filter((found) => found.className === ZOOM_LINE_CLASS)
		.map((found) => found.line);

const hiddenIndents = (state: EditorState) =>
	decorationsOf(state)
		.filter((found) => found.className === HIDDEN_INDENT_CLASS)
		.map((found) => [found.line, found.length]);

describe('cleanZoomDecorations', () => {
	it.each([
		['an item two levels in', 3, [3, 4]],
		['an item one level in', 2, [2, 3, 4, 5]],
	])('marks every line of %s', (_name, startLine, expected) => {
		expect(markedLines(zoomedOn(NOTE, startLine))).toEqual(expected);
	});

	it.each([
		['a top level item', 1],
		['a heading', 0],
		['no zoom', null],
	])('marks nothing for %s', (_name, startLine) => {
		expect(decorationsOf(zoomedOn(NOTE, startLine))).toEqual([]);
	});

	it('marks an item indented by two spaces when the tab size is four', () => {
		expect(markedLines(zoomedOn('- a\n  - b\n    - c', 1))).toEqual([1, 2]);
	});

	it('hides the indent steps of the levels above the zoomed item on every zoomed line', () => {
		expect(hiddenIndents(zoomedOn(NOTE, 3))).toEqual([
			[3, 2],
			[4, 2],
		]);
	});

	it('hides one step for an item one level in', () => {
		expect(hiddenIndents(zoomedOn(NOTE, 2))).toEqual([
			[2, 1],
			[3, 1],
			[4, 1],
			[5, 1],
		]);
	});

	it('hides two spaces for an item indented by two spaces', () => {
		expect(hiddenIndents(zoomedOn('- a\n  - b\n    - c', 1))).toEqual([
			[1, 2],
			[2, 2],
		]);
	});

	it('marks nothing without the zoom field', () => {
		expect(decorationsOf(EditorState.create({ doc: NOTE }))).toEqual([]);
	});
});
