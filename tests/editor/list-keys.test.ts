import { foldedRanges } from '@codemirror/language';
import { EditorSelection } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import {
	backspaceInItem,
	enterInEmptyItem,
	enterInParentItem,
	homeInItem,
	keepBulletOnBackspace,
	selectItemText,
	selectZoomedRange,
} from '../../src/editor/list-keys';
import { foldItem } from '../../src/editor/fold-control';
import { zoomIn } from '../../src/editor/zoom-control';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const always = () => true;

/** Places one cursor at each position, with the last one as the main cursor. */
function placeCursors(target: FakeZoomTarget, positions: number[]): void {
	target.state = target.state.update({
		selection: EditorSelection.create(
			positions.map((position) => EditorSelection.cursor(position)),
			positions.length - 1,
		),
	}).state;
}
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
		expect(target.dispatched[0]?.userEvent).toBe('roamer.list-enter');
	});

	it('scrolls the new cursor into view', () => {
		const target = new FakeZoomTarget('- a\n- ', 6);
		enterInEmptyItem(target);
		expect(target.dispatched[0]?.scrollIntoView).toBe(true);
	});

	it('changes the first line of the zoom when the zoomed item is the empty one', () => {
		const target = new FakeZoomTarget('- a\n  - ', 8);
		zoomIn(target);
		expect(enterInEmptyItem(target)).toBe(true);
		expect(target.text).toBe('- a\n- ');
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
		placeCursors(target, [1, 6]);
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
		expect(target.dispatched[0]?.userEvent).toBe('roamer.list-backspace');
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

	it('moves to the text start of a line that is not the first', () => {
		const target = new FakeZoomTarget('- x\n- abc', 9);
		expect(homeInItem(target, false, always)).toBe(true);
		expect(target.selected).toEqual({ from: 6, to: 6 });
	});

	it('does nothing at the text start of a line that is not the first', () => {
		const target = new FakeZoomTarget('- x\n- abc', 6);
		expect(homeInItem(target, false, always)).toBe(false);
	});

	it('scrolls the cursor into view as a selection change', () => {
		const target = new FakeZoomTarget('- abc', 5);
		homeInItem(target, false, always);
		expect(target.dispatched[0]).toMatchObject({ scrollIntoView: true, userEvent: 'select' });
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
		placeCursors(target, [5, 11]);
		expect(homeInItem(target, false, always)).toBe(false);
	});
});

describe('selectItemText', () => {
	it('selects the text of the item at the cursor', () => {
		const target = new FakeZoomTarget('- abc\n  - def', 4);
		expect(selectItemText(target)).toBe(true);
		expect(target.selected).toEqual({ from: 2, to: 5 });
	});

	it('scrolls the selection into view as a selection change', () => {
		const target = new FakeZoomTarget('- abc', 3);
		selectItemText(target);
		expect(target.dispatched[0]).toMatchObject({ scrollIntoView: true, userEvent: 'select' });
	});

	it.each([
		['starts before the text and ends inside it', 0, 3],
		['starts inside the text and ends at its end', 3, 5],
	])('selects the item text when the selection %s', (_name, anchor, head) => {
		const target = new FakeZoomTarget('- abc', 0);
		target.select(anchor, head);
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
		placeCursors(target, [3, 9]);
		expect(selectItemText(target)).toBe(false);
	});
});

describe('enterInParentItem', () => {
	it('adds a first child and puts the caret on it', () => {
		const target = new FakeZoomTarget('- a\n  - b', 3);
		expect(enterInParentItem(target)).toBe(true);
		expect(target.text).toBe('- a\n  - \n  - b');
		expect(target.caret).toBe(8);
	});

	it('changes the note in one transaction named for the key', () => {
		const target = new FakeZoomTarget('- a\n  - b', 3);
		enterInParentItem(target);
		expect(target.dispatched).toHaveLength(1);
		expect(target.dispatched[0]?.userEvent).toBe('roamer.list-enter');
	});

	it('does nothing for an item without children', () => {
		const target = new FakeZoomTarget('- a\n- b', 3);
		expect(enterInParentItem(target)).toBe(false);
		expect(target.dispatched).toHaveLength(0);
	});

	it('does nothing while text is selected', () => {
		const target = new FakeZoomTarget('- a\n  - b', 3);
		target.select(0, 3);
		expect(enterInParentItem(target)).toBe(false);
	});

	it('does nothing with several cursors', () => {
		const target = new FakeZoomTarget('- a\n  - b', 3);
		placeCursors(target, [1, 3]);
		expect(enterInParentItem(target)).toBe(false);
	});

	it('shows the new child of a folded item by unfolding it first', () => {
		const target = new FakeZoomTarget('- a\n  - b', 3);
		foldItem(target);
		expect(enterInParentItem(target)).toBe(true);
		expect(foldedRanges(target.state).size).toBe(0);
		expect(target.text).toBe('- a\n  - \n  - b');
	});
});

describe('keepBulletOnBackspace', () => {
	it.each([
		['the start of the text of a bullet that has children', '- a\n  - b\n    - c', 8],
		['the start of the text of the first bullet', '- a', 2],
		['the start of the text of a task', '- x\n- [ ] a', 10],
	])('does nothing at %s, so the bullet is kept', (_name, text, caret) => {
		const target = new FakeZoomTarget(text, caret);
		expect(keepBulletOnBackspace(target)).toBe(true);
		expect(target.text).toBe(text);
	});

	it('leaves Backspace to Obsidian in an empty item', () => {
		const target = new FakeZoomTarget('- ', 2);
		expect(keepBulletOnBackspace(target)).toBe(false);
	});

	it.each([
		['inside the text', '- abc', 4],
		['with a selection', '- abc', 2],
		['on a line that is not a list item', 'text', 0],
	])('leaves Backspace alone %s', (_name, text, caret) => {
		const target = new FakeZoomTarget(text, caret);
		if (_name === 'with a selection') {
			target.state = target.state.update({ selection: EditorSelection.range(2, 4) }).state;
		}
		expect(keepBulletOnBackspace(target)).toBe(false);
	});
});

describe('selectZoomedRange', () => {
	const NOTE = '- a\n- b\n  - c\n  - d\n- e';

	it('selects the zoomed item and what is under it, not the whole note', () => {
		const target = new FakeZoomTarget(NOTE, 6);
		zoomIn(target);
		expect(selectZoomedRange(target)).toBe(true);
		expect(target.state.sliceDoc(target.selected.from, target.selected.to)).toBe(
			'b\n  - c\n  - d',
		);
	});

	it('stays within the zoom when it is pressed again', () => {
		const target = new FakeZoomTarget(NOTE, 6);
		zoomIn(target);
		selectZoomedRange(target);
		const first = target.selected;
		expect(selectZoomedRange(target)).toBe(true);
		expect(target.selected).toEqual(first);
	});

	it('does nothing while the whole note is shown', () => {
		const target = new FakeZoomTarget(NOTE, 6);
		expect(selectZoomedRange(target)).toBe(false);
	});
});
