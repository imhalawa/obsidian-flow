import { foldEffect, foldedRanges } from '@codemirror/language';
import { describe, expect, it } from 'vitest';
import { foldAll, foldItem, unfoldAll, unfoldItem } from '../../src/editor/fold-control';
import { zoomIn } from '../../src/editor/zoom-control';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['intro', '- a', '  - b', '    - c', '  - d', '- e', '  - f'].join('\n');
const at = (text: string) => NOTE.indexOf(text);
const endOfLine = (line: number) =>
	NOTE.split('\n')
		.slice(0, line + 1)
		.join('\n').length;

const folds = (target: FakeZoomTarget) => {
	const found: [number, number][] = [];
	foldedRanges(target.state).between(0, target.state.doc.length, (from, to) => {
		found.push([from, to]);
	});
	return found.sort((a, b) => a[0] - b[0]);
};

describe('foldItem', () => {
	it('folds the item at the cursor from the end of its line to the end of its subtree', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		expect(foldItem(target)).toBe('done');
		expect(folds(target)).toEqual([[endOfLine(1), endOfLine(4)]]);
	});

	it('folds the deepest item that has children', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		foldItem(target);
		expect(folds(target)).toEqual([[endOfLine(2), endOfLine(3)]]);
	});

	it('does nothing when the item is already folded', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		foldItem(target);
		const before = target.dispatched.length;
		foldItem(target);
		expect(target.dispatched).toHaveLength(before);
	});

	it('reports a leaf and leaves the note alone', () => {
		const target = new FakeZoomTarget(NOTE, at('d'));
		expect(foldItem(target)).toBe('no-children');
		expect(folds(target)).toEqual([]);
	});

	it('reports a cursor outside a list item', () => {
		const target = new FakeZoomTarget(NOTE, 1);
		expect(foldItem(target)).toBe('not-a-list-item');
	});

	it('moves a cursor that the fold would hide to the end of the item line', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		target.dispatch({ selection: { anchor: endOfLine(1) } });
		foldItem(target);
		expect(target.caret).toBe(endOfLine(1));
	});

	it('keeps a cursor that stays visible where it is', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		foldItem(target);
		expect(target.caret).toBe(at('a'));
	});
});

describe('unfoldItem', () => {
	it('unfolds the item at the cursor', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		foldItem(target);
		expect(unfoldItem(target)).toBe('done');
		expect(folds(target)).toEqual([]);
	});

	it('unfolds a fold that another writer made with a shorter range', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		target.dispatch({ effects: foldEffect.of({ from: endOfLine(1), to: endOfLine(3) }) });
		unfoldItem(target);
		expect(folds(target)).toEqual([]);
	});

	it('does nothing when the item is not folded', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		const before = target.dispatched.length;
		expect(unfoldItem(target)).toBe('done');
		expect(target.dispatched).toHaveLength(before);
	});

	it('leaves other folds alone', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		foldAll(target);
		unfoldItem(target);
		expect(folds(target).map(([from]) => from)).not.toContain(endOfLine(1));
		expect(folds(target)).toHaveLength(2);
	});

	it('reports a leaf and a cursor outside a list item', () => {
		expect(unfoldItem(new FakeZoomTarget(NOTE, at('d')))).toBe('no-children');
		expect(unfoldItem(new FakeZoomTarget(NOTE, 1))).toBe('not-a-list-item');
	});
});

describe('foldAll and unfoldAll', () => {
	it('folds every item with children', () => {
		const target = new FakeZoomTarget(NOTE, 1);
		expect(foldAll(target)).toBe('done');
		expect(folds(target).map(([from]) => from)).toEqual([
			endOfLine(1),
			endOfLine(2),
			endOfLine(5),
		]);
	});

	it('folds only what is visible while zoomed', () => {
		const target = new FakeZoomTarget(NOTE, at('e'));
		zoomIn(target);
		foldAll(target);
		expect(folds(target).map(([from]) => from)).toEqual([endOfLine(5)]);
	});

	it('does not fold again what is folded', () => {
		const target = new FakeZoomTarget(NOTE, 1);
		foldAll(target);
		const before = target.dispatched.length;
		foldAll(target);
		expect(target.dispatched).toHaveLength(before);
	});

	it('moves a cursor that a fold would hide to the end of the folded line', () => {
		const target = new FakeZoomTarget(NOTE, at('c'));
		foldAll(target);
		expect(target.caret).toBe(endOfLine(1));
	});

	it('unfolds every fold in the note', () => {
		const target = new FakeZoomTarget(NOTE, 1);
		foldAll(target);
		expect(unfoldAll(target)).toBe('done');
		expect(folds(target)).toEqual([]);
	});

	it('does nothing when no fold exists', () => {
		const target = new FakeZoomTarget(NOTE, 1);
		const before = target.dispatched.length;
		unfoldAll(target);
		expect(target.dispatched).toHaveLength(before);
	});
});
