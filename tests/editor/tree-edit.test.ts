import { describe, expect, it } from 'vitest';
import { hasTreeTarget, runTreeEdit } from '../../src/editor/tree-edit';
import { indentItem, outdentItem } from '../../src/outline/indent';
import { moveItemDown, moveItemUp } from '../../src/outline/move';
import { zoomChange } from '../../src/editor/zoom-field';
import { FakeEditor } from '../support/fake-editor';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const caret = (line: number, ch: number) => ({ anchor: { line, ch }, head: { line, ch } });

describe('runTreeEdit', () => {
	it('indents the item under the cursor and keeps the cursor on its text', () => {
		const editor = new FakeEditor('- a\n  - x\n- b', [caret(2, 2)]);
		const outcome = runTreeEdit(editor.asEditor(), indentItem, false);
		expect(outcome).toEqual({ ok: true });
		expect(editor.text).toBe('- a\n  - x\n  - b');
		expect(editor.currentSelections).toEqual([caret(2, 4)]);
	});

	it('outdents every item in a multi line selection', () => {
		const editor = new FakeEditor('- p\n  - a\n  - b', [
			{ anchor: { line: 1, ch: 4 }, head: { line: 2, ch: 4 } },
		]);
		runTreeEdit(editor.asEditor(), outdentItem, false);
		expect(editor.text).toBe('- p\n- a\n- b');
		expect(editor.currentSelections).toEqual([
			{ anchor: { line: 1, ch: 2 }, head: { line: 2, ch: 2 } },
		]);
	});

	it('keeps the direction of a selection', () => {
		const editor = new FakeEditor('- a\n- b', [
			{ anchor: { line: 1, ch: 3 }, head: { line: 1, ch: 0 } },
		]);
		runTreeEdit(editor.asEditor(), indentItem, false);
		expect(editor.currentSelections).toEqual([
			{ anchor: { line: 1, ch: 4 }, head: { line: 1, ch: 1 } },
		]);
	});

	it('moves the cursor along with a moved item', () => {
		const editor = new FakeEditor('- a\n- b', [caret(1, 2)]);
		runTreeEdit(editor.asEditor(), moveItemUp, false);
		expect(editor.text).toBe('- b\n- a');
		expect(editor.currentSelections).toEqual([caret(0, 2)]);
	});

	it('moves several items down from the bottom up', () => {
		const editor = new FakeEditor('- a\n- b\n- c', [
			{ anchor: { line: 0, ch: 0 }, head: { line: 1, ch: 3 } },
		]);
		runTreeEdit(editor.asEditor(), moveItemDown, true);
		expect(editor.text).toBe('- c\n- a\n- b');
	});

	it('sends changes only for the lines that differ', () => {
		const editor = new FakeEditor('- p\n- a\n- b', [caret(1, 0)]);
		runTreeEdit(editor.asEditor(), indentItem, false);
		expect(editor.transactions[0]?.changes).toEqual([
			{ from: { line: 1, ch: 0 }, to: { line: 1, ch: 0 }, text: '\t' },
		]);
	});

	it('applies everything in one transaction', () => {
		const editor = new FakeEditor('- p\n- a\n- b', [
			{ anchor: { line: 1, ch: 0 }, head: { line: 2, ch: 3 } },
		]);
		runTreeEdit(editor.asEditor(), indentItem, false);
		expect(editor.transactions).toHaveLength(1);
	});

	it('ignores the last line of a selection that ends at its start', () => {
		const editor = new FakeEditor('- p\n- a\n- b', [
			{ anchor: { line: 1, ch: 0 }, head: { line: 2, ch: 0 } },
		]);
		runTreeEdit(editor.asEditor(), indentItem, false);
		expect(editor.text).toBe('- p\n\t- a\n- b');
	});

	it('ignores the last line of a backward selection that ends at its start', () => {
		const editor = new FakeEditor('- p\n- a\n- b', [
			{ anchor: { line: 2, ch: 0 }, head: { line: 1, ch: 1 } },
		]);
		runTreeEdit(editor.asEditor(), indentItem, false);
		expect(editor.text).toBe('- p\n\t- a\n- b');
	});

	it('includes the last line of a selection that ends inside it', () => {
		const editor = new FakeEditor('- p\n- a\n- b', [
			{ anchor: { line: 1, ch: 0 }, head: { line: 2, ch: 1 } },
		]);
		runTreeEdit(editor.asEditor(), indentItem, false);
		expect(editor.text).toBe('- p\n\t- a\n\t- b');
	});

	it('includes the line of a caret at the line start', () => {
		const editor = new FakeEditor('- p\n- a', [caret(1, 0)]);
		runTreeEdit(editor.asEditor(), indentItem, false);
		expect(editor.text).toBe('- p\n\t- a');
	});

	it('reports a refusal and leaves the note alone', () => {
		const editor = new FakeEditor('- a\n- b', [caret(0, 1)]);
		const outcome = runTreeEdit(editor.asEditor(), indentItem, false);
		expect(outcome).toEqual({ ok: false, reason: 'no-previous-sibling' });
		expect(editor.transactions).toHaveLength(0);
	});

	it('refuses when the cursor is not in a list item', () => {
		const editor = new FakeEditor('text', [caret(0, 1)]);
		expect(runTreeEdit(editor.asEditor(), indentItem, false)).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});
});

describe('hasTreeTarget', () => {
	it('is true with the cursor in an item', () => {
		expect(hasTreeTarget(new FakeEditor('- a', [caret(0, 1)]).asEditor())).toBe(true);
	});

	it('is false with the cursor in plain text', () => {
		expect(hasTreeTarget(new FakeEditor('text', [caret(0, 1)]).asEditor())).toBe(false);
	});
});

describe('runTreeEdit while zoomed', () => {
	const NOTE = '- a\n  - b\n  - c\n- d';

	const zoomedEditor = (zoomLine: number, caretLine: number, caretCh: number) => {
		const editor = new FakeEditor(NOTE, [caret(caretLine, caretCh)]);
		const zoom = new FakeZoomTarget(NOTE, 0);
		zoom.dispatch({ effects: zoomChange.of({ startLine: zoomLine, navigation: 'visit' }) });
		editor.cm = zoom;
		return editor;
	};

	it('edits items inside the zoomed range', () => {
		const editor = zoomedEditor(0, 2, 4);
		expect(runTreeEdit(editor.asEditor(), moveItemUp, false)).toEqual({ ok: true });
		expect(editor.text).toBe('- a\n  - c\n  - b\n- d');
	});

	it('refuses a move that would swap with an item outside the zoom', () => {
		const editor = zoomedEditor(0, 0, 2);
		const outcome = runTreeEdit(editor.asEditor(), moveItemDown, false);
		expect(outcome).toEqual({ ok: false, reason: 'outside-zoom' });
		expect(editor.text).toBe(NOTE);
		expect(editor.transactions).toHaveLength(0);
	});

	it('refuses a move that would swap with an item above the zoom', () => {
		const editor = zoomedEditor(2, 2, 4);
		const outcome = runTreeEdit(editor.asEditor(), moveItemUp, false);
		expect(outcome).toEqual({ ok: false, reason: 'outside-zoom' });
		expect(editor.text).toBe(NOTE);
	});

	it('allows a change to the first line of the zoomed range', () => {
		const editor = zoomedEditor(3, 3, 2);
		expect(runTreeEdit(editor.asEditor(), indentItem, false)).toEqual({ ok: true });
		expect(editor.text).toBe('- a\n  - b\n  - c\n  - d');
	});

	it('edits freely when the editor has no zoom', () => {
		const editor = new FakeEditor(NOTE, [caret(3, 2)]);
		editor.cm = new FakeZoomTarget(NOTE, 0);
		expect(runTreeEdit(editor.asEditor(), moveItemUp, false)).toEqual({ ok: true });
	});
});
