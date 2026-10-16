import { EditorState, StateEffect, type TransactionSpec } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { zoomChange, zoomField } from '../../src/editor/zoom-field';
import { zoomHistoryField } from '../../src/editor/zoom-history-field';

const NOTE = ['# Title', '- a', '  - b', '    - c', '  - d', '- e', 'text'].join('\n');

const create = (doc: string) =>
	EditorState.create({ doc, extensions: [zoomField, zoomHistoryField] });

const zoomed = (doc: string, startLine: number) =>
	create(doc).update({ effects: zoomChange.of({ startLine, navigation: 'visit' }) }).state;

const offsetOf = (doc: string, text: string) => doc.indexOf(text);

describe('zoomField', () => {
	it('starts without a zoom', () => {
		expect(create(NOTE).field(zoomField)).toBeNull();
	});

	it('zooms into the item that starts on the given line', () => {
		const zoom = zoomed(NOTE, 2).field(zoomField);
		expect(zoom?.from).toBe(offsetOf(NOTE, '  - b'));
		expect(zoom?.to).toBe(offsetOf(NOTE, '  - d') - 1);
		expect(zoom?.crumbs.map((crumb) => crumb.text)).toEqual(['Title', 'a', 'b']);
	});

	it('zooms out to the whole note', () => {
		const state = zoomed(NOTE, 2).update({
			effects: zoomChange.of({ startLine: null, navigation: 'visit' }),
		}).state;
		expect(state.field(zoomField)).toBeNull();
	});

	it('finds the zoom change among other effects', () => {
		const unrelated = StateEffect.define<number>();
		const state = create(NOTE).update({
			effects: [zoomChange.of({ startLine: 2, navigation: 'visit' }), unrelated.of(1)],
		}).state;
		expect(state.field(zoomField)?.crumbs.map((crumb) => crumb.text)).toEqual([
			'Title',
			'a',
			'b',
		]);
	});

	it('ignores a zoom into a line without an item', () => {
		expect(zoomed(NOTE, 6).field(zoomField)).toBeNull();
	});

	it('keeps the zoom when the document does not change', () => {
		const state = zoomed(NOTE, 2);
		const after = state.update({ selection: { anchor: 0 } }).state;
		expect(after.field(zoomField)).toBe(state.field(zoomField));
	});
});

describe('zoomField through edits', () => {
	const edit = (state: EditorState, spec: TransactionSpec) => state.update(spec).state;

	it('follows the item when lines are inserted above it', () => {
		const state = zoomed(NOTE, 2);
		const after = edit(state, { changes: { from: 0, insert: 'intro\n' } });
		expect(after.field(zoomField)?.from).toBe(offsetOf(after.doc.toString(), '  - b'));
		expect(after.field(zoomField)?.crumbs.map((crumb) => crumb.text)).toEqual([
			'Title',
			'a',
			'b',
		]);
	});

	it('grows the zoom when text is typed inside the item', () => {
		const state = zoomed(NOTE, 2);
		const at = offsetOf(NOTE, 'b') + 1;
		const after = edit(state, { changes: { from: at, insert: 'bb' } });
		const zoom = after.field(zoomField);
		expect(zoom?.to).toBe((state.field(zoomField)?.to ?? 0) + 2);
		expect(zoom?.crumbs.map((crumb) => crumb.text)).toEqual(['Title', 'a', 'bbb']);
	});

	it('keeps a new line added at the end of the zoomed item inside the zoom', () => {
		const state = zoomed(NOTE, 5);
		const end = state.field(zoomField)?.to ?? 0;
		const after = edit(state, { changes: { from: end, insert: '\n- f' } });
		expect(after.field(zoomField)?.to).toBe(end + 4);
	});

	it('follows the item when a line is inserted at its very start', () => {
		const state = zoomed(NOTE, 2);
		const from = state.field(zoomField)?.from ?? 0;
		const after = edit(state, { changes: { from, insert: '\n' } });
		expect(after.field(zoomField)?.from).toBe(from + 1);
	});

	it('drops the zoom when the item is no longer a list item', () => {
		const state = zoomed(NOTE, 2);
		const from = state.field(zoomField)?.from ?? 0;
		const after = edit(state, { changes: { from, to: from + 5, insert: 'plain' } });
		expect(after.field(zoomField)).toBeNull();
	});

	it('stays off when there was no zoom', () => {
		const after = edit(create(NOTE), { changes: { from: 0, insert: 'x' } });
		expect(after.field(zoomField)).toBeNull();
	});
});
