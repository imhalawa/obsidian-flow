import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { zoomChange, zoomField } from '../../src/editor/zoom-field';
import { zoomWasRemoved } from '../../src/editor/zoom-removed';

const zoomed = () =>
	EditorState.create({ doc: '- a\n- b', extensions: [zoomField] }).update({
		effects: zoomChange.of({ startLine: 1, navigation: 'visit' }),
	}).state;

describe('zoomWasRemoved', () => {
	it('is true when an edit destroys the zoomed item', () => {
		const before = zoomed();
		const transaction = before.update({ changes: { from: 4, to: 7, insert: 'plain' } });
		expect(zoomWasRemoved(before, transaction.state, [transaction])).toBe(true);
	});

	it('is false when the user zooms out', () => {
		const before = zoomed();
		const transaction = before.update({
			effects: zoomChange.of({ startLine: null, navigation: 'visit' }),
		});
		expect(zoomWasRemoved(before, transaction.state, [transaction])).toBe(false);
	});

	it('is false when an edit keeps the zoom', () => {
		const before = zoomed();
		const transaction = before.update({ changes: { from: 7, insert: '!' } });
		expect(zoomWasRemoved(before, transaction.state, [transaction])).toBe(false);
	});

	it('is false when nothing was zoomed', () => {
		const before = EditorState.create({ doc: '- a', extensions: [zoomField] });
		const transaction = before.update({ changes: { from: 0, insert: 'x' } });
		expect(zoomWasRemoved(before, transaction.state, [transaction])).toBe(false);
	});
});
