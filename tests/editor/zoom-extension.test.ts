import { EditorState, type TransactionSpec } from '@codemirror/state';
import { EditorView, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { describe, expect, it, vi } from 'vitest';
import { zoomChange, zoomField } from '../../src/editor/zoom-field';
import { zoomExtension } from '../../src/editor/zoom-extension';
import { zoomHistoryField } from '../../src/editor/zoom-history-field';

const NOTE = ['intro', '- a', '- b'].join('\n');

const create = (onRemoved: () => void) =>
	EditorState.create({ doc: NOTE, extensions: [zoomExtension(onRemoved)] });

const zoomedInto = (state: EditorState, startLine: number) =>
	state.update({ effects: zoomChange.of({ startLine, navigation: 'visit' }) }).state;

const rangeStarts = (set: DecorationSet) => {
	const starts: number[] = [];
	set.between(0, NOTE.length, (from) => {
		starts.push(from);
	});
	return starts;
};

describe('zoomExtension', () => {
	it('adds the zoom and history state', () => {
		const state = create(() => undefined);
		expect(state.field(zoomField)).toBeNull();
		expect(state.field(zoomHistoryField).entries).toEqual([null]);
	});

	it('keeps user edits inside the zoom', () => {
		const state = zoomedInto(
			create(() => undefined),
			1,
		);
		const spec: TransactionSpec = {
			changes: { from: 0, insert: 'x' },
			selection: { anchor: 1 },
			userEvent: 'input.type',
		};
		expect(state.update(spec).state.doc.toString()).toBe(NOTE);
	});

	it('draws the zoom through the decorations facet', () => {
		const state = zoomedInto(
			create(() => undefined),
			1,
		);
		const sets = state.facet(EditorView.decorations).map((source) => {
			if (typeof source === 'function') throw new Error('Expected a computed set.');
			return source;
		});
		expect(sets.flatMap(rangeStarts)).toEqual([0, 10]);
	});

	it('makes the hidden ranges atomic', () => {
		const state = zoomedInto(
			create(() => undefined),
			1,
		);
		const sources = state.facet(EditorView.atomicRanges);
		const view = { state } as EditorView;
		expect(sources.flatMap((source) => rangeStarts(source(view) as DecorationSet))).toEqual([
			0, 10,
		]);
	});

	it('calls back when an edit removes the zoomed item', () => {
		const onRemoved = vi.fn();
		const before = zoomedInto(create(onRemoved), 1);
		const transaction = before.update({ changes: { from: 6, to: 7, insert: 'x' } });
		const update = {
			startState: before,
			state: transaction.state,
			transactions: [transaction],
		} as unknown as ViewUpdate;
		for (const listener of before.facet(EditorView.updateListener)) listener(update);
		expect(onRemoved).toHaveBeenCalledTimes(1);
	});

	it('does not call back when the zoom stays', () => {
		const onRemoved = vi.fn();
		const before = zoomedInto(create(onRemoved), 1);
		const transaction = before.update({ changes: { from: 9, insert: 'x' } });
		const update = {
			startState: before,
			state: transaction.state,
			transactions: [transaction],
		} as unknown as ViewUpdate;
		for (const listener of before.facet(EditorView.updateListener)) listener(update);
		expect(onRemoved).not.toHaveBeenCalled();
	});
});
