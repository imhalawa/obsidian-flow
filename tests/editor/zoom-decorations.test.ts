import { EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { hiddenDecorations, zoomDecorations } from '../../src/editor/zoom-decorations';
import { zoomChange, zoomField } from '../../src/editor/zoom-field';

const NOTE = ['intro', '- a', '  - b', '- c'].join('\n');

const stateZoomedOn = (startLine: number | null) =>
	EditorState.create({ doc: NOTE, extensions: [zoomField] }).update({
		effects: zoomChange.of({ startLine, navigation: 'visit' }),
	}).state;

const rangesOf = (set: DecorationSet) => {
	const found: {
		from: number;
		to: number;
		block: boolean;
		replace: boolean;
		side?: number;
	}[] = [];
	set.between(0, NOTE.length, (from, to, decoration) => {
		const spec = decoration.spec as { block?: boolean; widget?: unknown; side?: number };
		found.push({
			from,
			to,
			block: spec.block === true,
			replace: spec.widget === undefined,
			side: spec.side,
		});
	});
	return found;
};

describe('hiddenDecorations', () => {
	it('hides nothing without a zoom', () => {
		expect(rangesOf(hiddenDecorations(stateZoomedOn(null)))).toEqual([]);
	});

	it('hides the lines above and below the zoomed item as blocks', () => {
		const state = stateZoomedOn(2);
		const zoom = state.field(zoomField);
		expect(rangesOf(hiddenDecorations(state))).toEqual([
			{ from: 0, to: zoom?.from, block: true, replace: true },
			{ from: zoom?.to, to: NOTE.length, block: true, replace: true },
		]);
	});

	it('hides only what is below when the zoom starts at the first line', () => {
		const state = EditorState.create({ doc: '- a\n- b', extensions: [zoomField] }).update({
			effects: zoomChange.of({ startLine: 0, navigation: 'visit' }),
		}).state;
		expect(rangesOf(hiddenDecorations(state))).toEqual([
			{ from: 3, to: 7, block: true, replace: true },
		]);
	});

	it('hides only what is above when the zoom ends at the last line', () => {
		const ranges = rangesOf(hiddenDecorations(stateZoomedOn(3)));
		expect(ranges).toHaveLength(1);
		expect(ranges[0]?.from).toBe(0);
	});
});

describe('zoomDecorations', () => {
	it('adds nothing without a zoom', () => {
		expect(rangesOf(zoomDecorations(stateZoomedOn(null)))).toEqual([]);
	});

	it('draws the breadcrumb trail in place of the hidden lines above the zoom', () => {
		const state = stateZoomedOn(2);
		const zoom = state.field(zoomField);
		expect(rangesOf(zoomDecorations(state))).toEqual([
			{ from: 0, to: zoom?.from, block: true, replace: false },
			{ from: zoom?.to, to: NOTE.length, block: true, replace: true },
		]);
	});

	it('draws the trail as a block widget above a zoom that starts the note', () => {
		const state = EditorState.create({ doc: '- a\n- b', extensions: [zoomField] }).update({
			effects: zoomChange.of({ startLine: 0, navigation: 'visit' }),
		}).state;
		expect(rangesOf(zoomDecorations(state))).toEqual([
			{ from: 0, to: 0, block: true, replace: false, side: -1 },
			{ from: 3, to: 7, block: true, replace: true },
		]);
	});

	it('draws only the trail when the zoom covers the whole note', () => {
		const state = EditorState.create({ doc: '- a', extensions: [zoomField] }).update({
			effects: zoomChange.of({ startLine: 0, navigation: 'visit' }),
		}).state;
		expect(rangesOf(zoomDecorations(state))).toEqual([
			{ from: 0, to: 0, block: true, replace: false, side: -1 },
		]);
	});
});
