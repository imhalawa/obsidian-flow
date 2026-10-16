import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { cleanZoomDecorations, ZOOM_LINE_CLASS } from '../../src/editor/clean-zoom-decorations';
import { zoomChange, zoomField } from '../../src/editor/zoom-field';

const NOTE = ['# T', '- a', '\t- b', '\t\t- c', '\t\t\t- d', '\t\t- e', '- f'].join('\n');

const zoomedOn = (doc: string, startLine: number | null) =>
	EditorState.create({ doc, extensions: [zoomField] }).update({
		effects: zoomChange.of({ startLine, navigation: 'visit' }),
	}).state;

const markedLines = (state: EditorState) => {
	const found: { line: number; className: string }[] = [];
	cleanZoomDecorations(state).between(0, state.doc.length, (from, _to, decoration) => {
		found.push({
			line: state.doc.lineAt(from).number - 1,
			className: (decoration.spec as { class: string }).class,
		});
	});
	return found;
};

const marked = (lines: number[]) => lines.map((line) => ({ line, className: ZOOM_LINE_CLASS }));

describe('cleanZoomDecorations', () => {
	it.each([
		['an item two levels in', 3, [3, 4]],
		['an item one level in', 2, [2, 3, 4, 5]],
	])('marks every line of %s', (_name, startLine, expected) => {
		expect(markedLines(zoomedOn(NOTE, startLine))).toEqual(marked(expected));
	});

	it.each([
		['a top level item', 1],
		['a heading', 0],
		['no zoom', null],
	])('marks nothing for %s', (_name, startLine) => {
		expect(markedLines(zoomedOn(NOTE, startLine))).toEqual([]);
	});

	it('marks an item indented by two spaces when the tab size is four', () => {
		expect(markedLines(zoomedOn('- a\n  - b\n    - c', 1))).toEqual(marked([1, 2]));
	});

	it('marks nothing without the zoom field', () => {
		expect(markedLines(EditorState.create({ doc: NOTE }))).toEqual([]);
	});
});
