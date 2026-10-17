import { EditorState, Transaction, type TransactionSpec } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { zoomChange, zoomField } from '../../src/editor/zoom-field';
import { setViewFocus } from '../../src/editor/view-focus';
import { zoomEditFilter } from '../../src/editor/zoom-filter';
import { zoomHistoryField } from '../../src/editor/zoom-history-field';

const NOTE = ['intro', '- a', '  - b', '- c'].join('\n');
const B_FROM = NOTE.indexOf('  - b');
const B_TO = NOTE.indexOf('- c') - 1;

const extensions = [zoomField, zoomHistoryField, zoomEditFilter];

const zoomedIntoB = () =>
	EditorState.create({ doc: NOTE, extensions }).update({
		effects: zoomChange.of({ startLine: 2, navigation: 'visit' }),
	}).state;

const apply = (state: EditorState, spec: TransactionSpec) =>
	state.update(spec).state.doc.toString();

const typed = (from: number, to: number, insert: string): TransactionSpec => ({
	changes: { from, to, insert },
	selection: { anchor: from + insert.length },
	userEvent: 'input.type',
});

describe('zoomEditFilter', () => {
	it.each([
		['typing inside the zoom', typed(B_FROM + 5, B_FROM + 5, 'x'), true],
		['typing at the start of the zoom', typed(B_FROM, B_FROM, ' '), true],
		['typing at the end of the zoom', typed(B_TO, B_TO, '!'), true],
		['replacing the whole zoom', typed(B_FROM, B_TO, '  - z'), true],
		['typing in the hidden text above', typed(0, 0, 'x'), false],
		['typing in the hidden text below', typed(B_TO + 2, B_TO + 2, 'x'), false],
		['deleting the line break above the zoom', typed(B_FROM - 1, B_FROM, ''), false],
		['deleting the line break below the zoom', typed(B_TO, B_TO + 1, ''), false],
		['a change that spans the zoom edge', typed(B_FROM - 2, B_FROM + 2, ''), false],
	])('handles %s', (_name, spec, allowed) => {
		const changed = apply(zoomedIntoB(), spec) !== NOTE;
		expect(changed).toBe(allowed);
	});

	it('refuses a user change outside the zoom as one empty transaction', () => {
		const transaction = zoomedIntoB().update(typed(0, 0, 'x'));
		expect(transaction.docChanged).toBe(false);
	});

	it('lets changes without a user event through, as sync does', () => {
		expect(apply(zoomedIntoB(), { changes: { from: 0, insert: 'x' } })).toBe(`x${NOTE}`);
	});

	it('lets through a change forwarded from another pane, which keeps its user event and cursor, while this view has no focus', () => {
		const unfocused = zoomedIntoB().update({ effects: setViewFocus.of(false) }).state;
		expect(apply(unfocused, typed(0, 0, 'x'))).toBe(`x${NOTE}`);
	});

	it('blocks the same change again once the view has focus', () => {
		const unfocused = zoomedIntoB().update({ effects: setViewFocus.of(false) }).state;
		const focused = unfocused.update({ effects: setViewFocus.of(true) }).state;
		expect(apply(focused, typed(0, 0, 'x'))).toBe(NOTE);
	});

	it('lets remote changes through even with a user event', () => {
		const spec: TransactionSpec = {
			changes: { from: 0, insert: 'x' },
			userEvent: 'input.type',
			annotations: Transaction.remote.of(true),
		};
		expect(apply(zoomedIntoB(), spec)).toBe(`x${NOTE}`);
	});

	it('lets a user change through when nothing is zoomed', () => {
		const state = EditorState.create({ doc: NOTE, extensions });
		expect(apply(state, typed(0, 0, 'x'))).toBe(`x${NOTE}`);
	});

	it('lets a zoom change that also edits the document through', () => {
		const spec: TransactionSpec = {
			...typed(0, 0, 'x'),
			effects: zoomChange.of({ startLine: null, navigation: 'visit' }),
		};
		expect(apply(zoomedIntoB(), spec)).toBe(`x${NOTE}`);
	});

	it('lets a selection change through', () => {
		const transaction = zoomedIntoB().update({ selection: { anchor: 0 }, userEvent: 'select' });
		expect(transaction.state.selection.main.head).toBe(0);
	});
});
