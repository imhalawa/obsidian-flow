import { EditorSelection, EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { findIdSpans, hiddenIdDecorations } from '../../src/editor/block-id-decorations';

const NOTE = ['- a ^one', '- b ^two', '  - c', '- d ^three'].join('\n');

const rangesOf = (set: DecorationSet) => {
	const found: [number, number][] = [];
	set.between(0, NOTE.length, (from, to) => {
		found.push([from, to]);
	});
	return found;
};

const hiddenWith = (selection: EditorSelection) => {
	const state = EditorState.create({
		doc: NOTE,
		selection,
		extensions: [EditorState.allowMultipleSelections.of(true)],
	});
	return rangesOf(hiddenIdDecorations(state, findIdSpans(state)));
};

describe('hiddenIdDecorations', () => {
	it('hides every id when the cursor is on a line without one', () => {
		expect(hiddenWith(EditorSelection.single(NOTE.indexOf('c')))).toEqual([
			[3, 8],
			[12, 17],
			[NOTE.indexOf(' ^three'), NOTE.length],
		]);
	});

	it('shows the id on the cursor line', () => {
		expect(hiddenWith(EditorSelection.single(2))).toEqual([
			[12, 17],
			[NOTE.indexOf(' ^three'), NOTE.length],
		]);
	});

	it('shows the ids on every line a selection touches', () => {
		const selection = EditorSelection.single(2, NOTE.indexOf('b') + 1);
		expect(hiddenWith(selection)).toEqual([[NOTE.indexOf(' ^three'), NOTE.length]]);
	});

	it('shows the ids on the lines of every cursor', () => {
		const selection = EditorSelection.create([
			EditorSelection.cursor(1),
			EditorSelection.cursor(NOTE.length),
		]);
		expect(hiddenWith(selection)).toEqual([[12, 17]]);
	});

	it('hides nothing in a note without ids', () => {
		const state = EditorState.create({ doc: '- a\n- b' });
		expect(rangesOf(hiddenIdDecorations(state, findIdSpans(state)))).toEqual([]);
	});

	it('hides ids as replacements so the cursor skips over them', () => {
		const state = EditorState.create({ doc: '- a ^x\n- b', selection: { anchor: 8 } });
		const set = hiddenIdDecorations(state, findIdSpans(state));
		let replace = false;
		set.between(0, 10, (_from, _to, decoration) => {
			const spec = decoration.spec as { widget?: unknown; block?: boolean };
			replace = spec.widget === undefined && spec.block !== true;
		});
		expect(replace).toBe(true);
	});
});

describe('findIdSpans', () => {
	it('uses the tab size of the state to read items', () => {
		const state = EditorState.create({
			doc: '- a\n\t- b ^x',
			extensions: [EditorState.tabSize.of(2)],
		});
		expect(findIdSpans(state)).toEqual([{ lineIndex: 1, from: 4, to: 7 }]);
	});
});
