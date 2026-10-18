import { EditorSelection, EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { keepBulletsOutOfSelection } from '../../src/editor/bullet-selection';

const NOTE = ['- a', '\t- bcd', 'plain', '- e'].join('\n');

const create = (enabled: boolean) =>
	EditorState.create({
		doc: NOTE,
		extensions: [
			EditorState.allowMultipleSelections.of(true),
			keepBulletsOutOfSelection(() => enabled),
		],
	});

const selected = (state: EditorState, anchor: number, head: number) => {
	const next = state.update({ selection: EditorSelection.single(anchor, head) }).state;
	return [next.selection.main.anchor, next.selection.main.head];
};

describe('keepBulletsOutOfSelection', () => {
	it.each([
		['a cursor at the start of a bullet line', 0, 0, [2, 2]],
		['a cursor inside a marker', 1, 1, [2, 2]],
		['a cursor in the indent of a nested bullet', 4, 4, [7, 7]],
		['a selection that starts in the marker', 0, 3, [2, 3]],
		['a backward selection that ends in the marker', 3, 0, [3, 2]],
		['a selection of several lines that starts in the marker', 0, 14, [2, 14]],
	])('moves %s to the text', (_name, anchor, head, expected) => {
		expect(selected(create(true), anchor, head)).toEqual(expected);
	});

	it.each([
		['a cursor inside the text', 9, 9],
		['a selection of text', 2, 3],
		['a cursor on a line that is not a list item', 12, 12],
	])('leaves %s alone', (_name, anchor, head) => {
		expect(selected(create(true), anchor, head)).toEqual([anchor, head]);
	});

	it('moves the end of a selection that reaches into the marker of a later item', () => {
		const state = create(true);
		const start = NOTE.indexOf('- e');
		expect(selected(state, 2, start + 1)).toEqual([2, start + 2]);
	});

	it('leaves the cursor alone in an item that holds only an embed', () => {
		const state = EditorState.create({
			doc: ['- a', '\t- ![[Note]]', '- z'].join('\n'),
			extensions: [keepBulletsOutOfSelection(() => true)],
		});
		const next = state.update({ selection: EditorSelection.cursor(4) }).state;
		expect(next.selection.main.head).toBe(4);
	});

	it('keeps a selection of the whole note, so select all still covers every bullet', () => {
		expect(selected(create(true), 0, NOTE.length)).toEqual([0, NOTE.length]);
		expect(selected(create(true), NOTE.length, 0)).toEqual([NOTE.length, 0]);
	});

	it('changes nothing while the setting is off', () => {
		expect(selected(create(false), 0, 3)).toEqual([0, 3]);
	});

	it('keeps every range of a multiple selection in the text', () => {
		const state = create(true);
		const next = state.update({
			selection: EditorSelection.create([
				EditorSelection.cursor(0),
				EditorSelection.cursor(9),
			]),
		}).state;
		expect(next.selection.ranges.map((range) => range.head)).toEqual([2, 9]);
	});

	it('does not touch a transaction that changes the text', () => {
		const state = create(true);
		const next = state.update({
			changes: { from: 0, insert: 'x' },
			selection: EditorSelection.cursor(0),
		}).state;
		expect(next.selection.main.head).toBe(0);
	});
});
