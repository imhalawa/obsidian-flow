import { EditorSelection } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import {
	backspaceInItem,
	enterInEmptyItem,
	homeInItem,
	selectItemText,
} from '../../src/editor/list-keys';
import { zoomIn } from '../../src/editor/zoom-control';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const always = () => true;
const never = () => false;

describe('enterInEmptyItem', () => {
	it('ends the list at an empty top level item and keeps the caret on the empty line', () => {
		const target = new FakeZoomTarget('- a\n- ', 6);
		expect(enterInEmptyItem(target)).toBe(true);
		expect(target.text).toBe('- a\n');
		expect(target.caret).toBe(4);
	});

	it('outdents an empty nested item with the caret at its end', () => {
		const target = new FakeZoomTarget('- a\n  - ', 8);
		expect(enterInEmptyItem(target)).toBe(true);
		expect(target.text).toBe('- a\n- ');
		expect(target.caret).toBe(6);
	});

	it('changes the note in one transaction named for the key', () => {
		const target = new FakeZoomTarget('- a\n- ', 6);
		enterInEmptyItem(target);
		expect(target.dispatched).toHaveLength(1);
		expect(target.dispatched[0]?.userEvent).toBe('flow.list-enter');
	});

	it('does nothing for an item with text', () => {
		const target = new FakeZoomTarget('- a\n- b', 7);
		expect(enterInEmptyItem(target)).toBe(false);
		expect(target.dispatched).toHaveLength(0);
	});

	it('does nothing while text is selected', () => {
		const target = new FakeZoomTarget('- a\n- ', 6);
		target.select(0, 6);
		expect(enterInEmptyItem(target)).toBe(false);
	});

	it('does nothing with several cursors', () => {
		const target = new FakeZoomTarget('- a\n- ', 6);
		target.state = target.state.update({
			selection: EditorSelection.create([
				EditorSelection.cursor(1),
				EditorSelection.cursor(6),
			]),
		}).state;
		expect(enterInEmptyItem(target)).toBe(false);
	});

	it('works inside a zoom', () => {
		const target = new FakeZoomTarget('- a\n  - b\n    - ', 16);
		target.state = target.state.update({ selection: EditorSelection.cursor(5) }).state;
		zoomIn(target);
		target.state = target.state.update({ selection: EditorSelection.cursor(16) }).state;
		expect(enterInEmptyItem(target)).toBe(true);
		expect(target.text).toBe('- a\n  - b\n  - ');
	});

	it('does nothing when the change would reach outside the zoom', () => {
		const text = '- a\n  1. \n  2. c';
		const target = new FakeZoomTarget(text, 6);
		zoomIn(target);
		target.state = target.state.update({ selection: EditorSelection.cursor(9) }).state;
		expect(enterInEmptyItem(target)).toBe(false);
		expect(target.text).toBe(text);
	});
});

describe('backspaceInItem', () => {
	it('merges the item into the item above with the caret at the join', () => {
		const target = new FakeZoomTarget('- one\n- two', 8);
		expect(backspaceInItem(target)).toBe(true);
		expect(target.text).toBe('- onetwo');
		expect(target.caret).toBe(5);
		expect(target.dispatched[0]?.userEvent).toBe('flow.list-backspace');
	});

	it('does nothing in the middle of the text', () => {
		const target = new FakeZoomTarget('- one\n- two', 9);
		expect(backspaceInItem(target)).toBe(false);
	});

	it('does nothing while text is selected', () => {
		const target = new FakeZoomTarget('- one\n- two', 8);
		target.select(8, 10);
		expect(backspaceInItem(target)).toBe(false);
	});

	it('does not merge into a line the zoom hides', () => {
		const target = new FakeZoomTarget('- one\n- two\n- three', 8);
		zoomIn(target);
		expect(backspaceInItem(target)).toBe(false);
		expect(target.text).toBe('- one\n- two\n- three');
	});
});

describe('homeInItem', () => {
	it('moves the cursor to the start of the item text', () => {
		const target = new FakeZoomTarget('- abc', 5);
		expect(homeInItem(target, false, always)).toBe(true);
		expect(target.selected).toEqual({ from: 2, to: 2 });
	});

	it('extends the selection from its anchor when asked to', () => {
		const target = new FakeZoomTarget('- abc', 5);
		expect(homeInItem(target, true, always)).toBe(true);
		expect(target.selected).toEqual({ from: 2, to: 5 });
	});

	it('does nothing when the cursor is already at the text start', () => {
		const target = new FakeZoomTarget('- abc', 2);
		expect(homeInItem(target, false, always)).toBe(false);
	});

	it('does nothing when the cursor is not on the first visual row of the line', () => {
		const target = new FakeZoomTarget('- abc', 5);
		expect(homeInItem(target, false, never)).toBe(false);
		expect(target.dispatched).toHaveLength(0);
	});

	it('asks about the position of the cursor head', () => {
		const target = new FakeZoomTarget('- abc', 5);
		const asked: number[] = [];
		homeInItem(target, false, (position) => {
			asked.push(position);
			return true;
		});
		expect(asked).toEqual([5]);
	});

	it('does nothing with several cursors', () => {
		const target = new FakeZoomTarget('- abc\n- def', 5);
		target.state = target.state.update({
			selection: EditorSelection.create([
				EditorSelection.cursor(5),
				EditorSelection.cursor(11),
			]),
		}).state;
		expect(homeInItem(target, false, always)).toBe(false);
	});
});

describe('selectItemText', () => {
	it('selects the text of the item at the cursor', () => {
		const target = new FakeZoomTarget('- abc\n  - def', 4);
		expect(selectItemText(target)).toBe(true);
		expect(target.selected).toEqual({ from: 2, to: 5 });
	});

	it('leaves the next select all to the editor once the item text is selected', () => {
		const target = new FakeZoomTarget('- abc', 3);
		selectItemText(target);
		expect(selectItemText(target)).toBe(false);
	});

	it('leaves select all to the editor when the selection is already larger', () => {
		const target = new FakeZoomTarget('- abc\n- def', 0);
		target.select(0, 11);
		expect(selectItemText(target)).toBe(false);
	});

	it('selects the item text when only part of it is selected', () => {
		const target = new FakeZoomTarget('- abc', 3);
		target.select(3, 4);
		expect(selectItemText(target)).toBe(true);
		expect(target.selected).toEqual({ from: 2, to: 5 });
	});

	it('does nothing outside a list item', () => {
		const target = new FakeZoomTarget('plain', 2);
		expect(selectItemText(target)).toBe(false);
	});

	it('does nothing with several cursors', () => {
		const target = new FakeZoomTarget('- abc\n- def', 3);
		target.state = target.state.update({
			selection: EditorSelection.create([
				EditorSelection.cursor(3),
				EditorSelection.cursor(9),
			]),
		}).state;
		expect(selectItemText(target)).toBe(false);
	});
});
