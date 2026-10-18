import { codeFolding, foldEffect, foldedRanges } from '@codemirror/language';
import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { dropAcross, dropWithin } from '../../src/editor/drag-move';
import { zoomIn } from '../../src/editor/zoom-control';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = '- a\n  - b\n- c\n- d';

describe('dropWithin', () => {
	it('moves an item and its subtree in one transaction named for the drag', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		expect(dropWithin(target, 0, { kind: 'after', targetLine: 3 })).toEqual({ ok: true });
		expect(target.text).toBe('- c\n- d\n- a\n  - b');
		expect(target.dispatched).toHaveLength(1);
		expect(target.dispatched[0]?.userEvent).toBe('roamer.drag-move');
	});

	it('puts the cursor at the start of the text of the moved item', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		dropWithin(target, 0, { kind: 'after', targetLine: 3 });
		expect(target.caret).toBe(10);
	});

	it('scrolls the moved item into view', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		dropWithin(target, 0, { kind: 'after', targetLine: 3 });
		expect(target.dispatched[0]?.scrollIntoView).toBe(true);
	});

	it('changes nothing when the item is dropped where it is', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		expect(dropWithin(target, 2, { kind: 'before', targetLine: 3 })).toEqual({ ok: true });
		expect(target.dispatched).toHaveLength(0);
		expect(target.text).toBe(NOTE);
	});

	it('reports a refusal and leaves the note alone', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		expect(dropWithin(target, 0, { kind: 'before', targetLine: 1 })).toEqual({
			ok: false,
			reason: 'drop-into-self',
		});
		expect(target.text).toBe(NOTE);
	});

	it('moves items inside a zoom', () => {
		const target = new FakeZoomTarget('- a\n- p\n  - b\n  - c\n- d', 0);
		target.state = target.state.update({ selection: EditorSelection.cursor(4) }).state;
		zoomIn(target);
		expect(dropWithin(target, 3, { kind: 'before', targetLine: 2 })).toEqual({ ok: true });
		expect(target.text).toBe('- a\n- p\n  - c\n  - b\n- d');
	});

	it('refuses a move that would change lines outside the zoom', () => {
		const target = new FakeZoomTarget('- a\n- p\n  - b\n- d', 0);
		target.state = target.state.update({ selection: EditorSelection.cursor(4) }).state;
		zoomIn(target);
		expect(dropWithin(target, 2, { kind: 'after', targetLine: 3 })).toEqual({
			ok: false,
			reason: 'outside-zoom',
		});
		expect(target.text).toBe('- a\n- p\n  - b\n- d');
	});
});

describe('dropWithin zoom bounds', () => {
	const zoomedOnFirstItem = (note: string) => {
		const target = new FakeZoomTarget(note, 0);
		zoomIn(target);
		return target;
	};

	it('allows a change that starts on the first zoomed line and ends on the last', () => {
		const target = zoomedOnFirstItem('- a\n  - b\n- c');
		expect(dropWithin(target, 1, { kind: 'before', targetLine: 0 })).toEqual({ ok: true });
		expect(target.text).toBe('- b\n- a\n- c');
	});

	it('refuses a place above the first zoomed line', () => {
		const target = new FakeZoomTarget('- a\n- p\n  - b', 4);
		zoomIn(target);
		expect(dropWithin(target, 2, { kind: 'before', targetLine: 0 })).toEqual({
			ok: false,
			reason: 'outside-zoom',
		});
		expect(target.text).toBe('- a\n- p\n  - b');
	});

	it('moves items in a note that has no zoom state', () => {
		const dispatched: TransactionSpec[] = [];
		const plain = {
			state: EditorState.create({ doc: NOTE, extensions: [codeFolding()] }),
			dispatch(spec: TransactionSpec): void {
				dispatched.push(spec);
				this.state = this.state.update(spec).state;
			},
		};
		expect(dropWithin(plain, 0, { kind: 'after', targetLine: 3 })).toEqual({ ok: true });
		expect(plain.state.doc.toString()).toBe('- c\n- d\n- a\n  - b');
	});
});

describe('dropWithin folds', () => {
	const foldsOf = (target: FakeZoomTarget) => {
		const ranges: { from: number; to: number }[] = [];
		foldedRanges(target.state).between(0, target.state.doc.length, (from, to) => {
			ranges.push({ from, to });
		});
		return ranges;
	};

	it('keeps a folded item folded when it moves', () => {
		const target = new FakeZoomTarget('- a\n  - b\n- c\n- d', 0);
		target.dispatch({ effects: foldEffect.of({ from: 3, to: 8 }) });
		dropWithin(target, 0, { kind: 'after', targetLine: 3 });
		expect(target.text).toBe('- c\n- d\n- a\n  - b');
		expect(foldsOf(target)).toEqual([{ from: 11, to: 17 }]);
	});

	it('keeps the fold of an item that only shifts to another line', () => {
		const target = new FakeZoomTarget('- a\n- c\n  - c1\n- d', 0);
		target.dispatch({ effects: foldEffect.of({ from: 7, to: 14 }) });
		dropWithin(target, 0, { kind: 'after', targetLine: 3 });
		expect(target.text).toBe('- c\n  - c1\n- d\n- a');
		expect(foldsOf(target)).toEqual([{ from: 3, to: 10 }]);
	});

	it('keeps the folds inside a moved subtree', () => {
		const target = new FakeZoomTarget('- a\n  - b\n    - b1\n- c', 0);
		target.dispatch({ effects: foldEffect.of({ from: 9, to: 18 }) });
		dropWithin(target, 0, { kind: 'after', targetLine: 3 });
		expect(target.text).toBe('- c\n- a\n  - b\n    - b1');
		expect(foldsOf(target)).toEqual([{ from: 13, to: 22 }]);
	});

	it('leaves a fold of a heading outside the changed lines alone', () => {
		const target = new FakeZoomTarget('# h\ntext\n- a\n- b', 0);
		target.dispatch({ effects: foldEffect.of({ from: 3, to: 8 }) });
		dropWithin(target, 2, { kind: 'after', targetLine: 3 });
		expect(target.text).toBe('# h\ntext\n- b\n- a');
		expect(target.dispatched).toHaveLength(2);
		expect(foldsOf(target)).toEqual([{ from: 3, to: 8 }]);
	});

	it('does not touch folds when the note has none', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		dropWithin(target, 0, { kind: 'after', targetLine: 3 });
		expect(target.dispatched).toHaveLength(1);
		expect(foldsOf(target)).toEqual([]);
	});
});

describe('dropAcross', () => {
	const after = (targetLine: number) => ({ kind: 'after', targetLine }) as const;

	it('adds the item to the other note and then removes it from the source', () => {
		const source = new FakeZoomTarget(NOTE, 0);
		const destination = new FakeZoomTarget('- x\n- y', 0);
		expect(dropAcross(source, 0, destination, after(0))).toEqual({ ok: true });
		expect(destination.text).toBe('- x\n- a\n  - b\n- y');
		expect(source.text).toBe('- c\n- d');
	});

	it('writes the destination before it removes the source', () => {
		const order: string[] = [];
		const source = new FakeZoomTarget(NOTE, 0);
		const destination = new FakeZoomTarget('- x', 0);
		source.onUpdate(() => order.push('source'));
		destination.onUpdate(() => order.push('destination'));
		dropAcross(source, 0, destination, after(0));
		expect(order).toEqual(['destination', 'source']);
	});

	it('appends at the end of the other note', () => {
		const source = new FakeZoomTarget(NOTE, 0);
		const destination = new FakeZoomTarget('- x', 0);
		dropAcross(source, 0, destination, after(0));
		expect(destination.text).toBe('- x\n- a\n  - b');
	});

	it('puts the cursor at the start of the text of the added item', () => {
		const source = new FakeZoomTarget(NOTE, 0);
		const destination = new FakeZoomTarget('- x\n- y', 0);
		dropAcross(source, 0, destination, after(0));
		expect(destination.caret).toBe(6);
	});

	it('uses one transaction named for the drag in each note', () => {
		const source = new FakeZoomTarget(NOTE, 0);
		const destination = new FakeZoomTarget('- x', 0);
		dropAcross(source, 0, destination, after(0));
		expect(source.dispatched).toHaveLength(1);
		expect(source.dispatched[0]?.userEvent).toBe('roamer.drag-move');
		expect(destination.dispatched).toHaveLength(1);
		expect(destination.dispatched[0]?.userEvent).toBe('roamer.drag-move');
		expect(destination.dispatched[0]?.scrollIntoView).toBe(true);
	});

	it('removes the last item of a note with the line break before it', () => {
		const source = new FakeZoomTarget('- c\n- d', 0);
		dropAcross(source, 1, new FakeZoomTarget('- x', 0), after(0));
		expect(source.text).toBe('- c');
	});

	it('leaves an empty note when the only item moves away', () => {
		const source = new FakeZoomTarget('- c', 0);
		dropAcross(source, 0, new FakeZoomTarget('- x', 0), after(0));
		expect(source.text).toBe('');
	});

	it('leaves the source alone when the destination refuses', () => {
		const source = new FakeZoomTarget(NOTE, 0);
		const destination = new FakeZoomTarget('text', 0);
		expect(dropAcross(source, 0, destination, after(0))).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
		expect(source.text).toBe(NOTE);
		expect(destination.text).toBe('text');
	});

	it('refuses a source line that starts no item', () => {
		const source = new FakeZoomTarget('text', 0);
		const destination = new FakeZoomTarget('- x', 0);
		expect(dropAcross(source, 0, destination, after(0))).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
		expect(destination.text).toBe('- x');
	});

	it('writes inside a zoom of the destination when the next line is outside it', () => {
		const destination = new FakeZoomTarget('- p\n  - q\n- r', 0);
		zoomIn(destination);
		dropAcross(new FakeZoomTarget('- a', 0), 0, destination, after(1));
		expect(destination.text).toBe('- p\n  - q\n  - a\n- r');
	});

	it('leaves the source alone when the destination zoom does not allow the item there', () => {
		const source = new FakeZoomTarget(NOTE, 0);
		const destination = new FakeZoomTarget('- p\n  - q\n- r', 0);
		zoomIn(destination);
		expect(dropAcross(source, 0, destination, after(2))).toEqual({
			ok: false,
			reason: 'outside-zoom',
		});
		expect(source.text).toBe(NOTE);
		expect(destination.text).toBe('- p\n  - q\n- r');
	});

	it('removes the last item of a zoomed source with the line break before it', () => {
		const source = new FakeZoomTarget('- a\n- p\n  - b\n  - c\n- d', 4);
		zoomIn(source);
		dropAcross(source, 3, new FakeZoomTarget('- x', 0), after(0));
		expect(source.text).toBe('- a\n- p\n  - b\n- d');
	});

	it('keeps an empty line when the zoomed item is the only visible one', () => {
		const source = new FakeZoomTarget('- a\n- p\n  - b\n  - c\n- d', 19);
		zoomIn(source);
		dropAcross(source, 3, new FakeZoomTarget('- x', 0), after(0));
		expect(source.text).toBe('- a\n- p\n  - b\n\n- d');
	});

	it('removes a line from a zoom when the next line is the last zoomed line', () => {
		const source = new FakeZoomTarget('- a\n- p\n  - b\n  - c\n  - d\n- e', 4);
		zoomIn(source);
		dropAcross(source, 3, new FakeZoomTarget('- x', 0), after(0));
		expect(source.text).toBe('- a\n- p\n  - b\n  - d\n- e');
	});
});
