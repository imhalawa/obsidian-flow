import { foldEffect, foldedRanges } from '@codemirror/language';
import { EditorSelection, EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import {
	canStep,
	clampSelection,
	isZoomed,
	stepHistory,
	zoomIn,
	zoomOut,
	zoomReset,
	zoomTargetOf,
} from '../../src/editor/zoom-control';
import { zoomField } from '../../src/editor/zoom-field';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['intro', '- a', '  - b', '    - c', '- d'].join('\n');
const at = (text: string) => NOTE.indexOf(text);

const crumbTexts = (target: FakeZoomTarget) => target.zoom?.crumbs.map((crumb) => crumb.text);

describe('zoomIn', () => {
	it('zooms into the item under the cursor', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		expect(zoomIn(target)).toBe('done');
		expect(crumbTexts(target)).toEqual(['a', 'b']);
	});

	it('zooms deeper when already zoomed and the cursor is in a child', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		zoomIn(target);
		target.dispatch({ selection: { anchor: at('c') } });
		zoomIn(target);
		expect(crumbTexts(target)).toEqual(['a', 'b', 'c']);
	});

	it('reports a cursor outside any list item and changes nothing', () => {
		const target = new FakeZoomTarget(NOTE, 2);
		expect(zoomIn(target)).toBe('not-a-list-item');
		expect(target.zoom).toBeNull();
	});
});

describe('zoomOut and zoomReset', () => {
	it('zooms out one level to the parent item', () => {
		const target = new FakeZoomTarget(NOTE, at('c'));
		zoomIn(target);
		expect(zoomOut(target)).toBe('done');
		expect(crumbTexts(target)).toEqual(['a', 'b']);
	});

	it('zooms out of a top level item to the whole note', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		zoomIn(target);
		zoomOut(target);
		expect(target.zoom).toBeNull();
	});

	it('does nothing when zooming out of the whole note', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		expect(zoomOut(target)).toBe('done');
		expect(target.zoom).toBeNull();
	});

	it('shows the whole note from any depth', () => {
		const target = new FakeZoomTarget(NOTE, at('c'));
		zoomIn(target);
		expect(zoomReset(target)).toBe('done');
		expect(target.zoom).toBeNull();
	});

	it('knows whether it is zoomed', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		expect(isZoomed(target)).toBe(false);
		zoomIn(target);
		expect(isZoomed(target)).toBe(true);
	});
});

describe('folds around a zoom', () => {
	it('unfolds a parent that hides the item being zoomed into', () => {
		const target = new FakeZoomTarget(NOTE, at('c'));
		const parentEnd = NOTE.indexOf('\n', at('a'));
		target.dispatch({ effects: foldEffect.of({ from: parentEnd, to: at('d') - 1 }) });
		target.dispatch({ selection: { anchor: parentEnd } });
		target.dispatch({ selection: { anchor: at('c') } });
		zoomIn(target);
		let folded = 0;
		foldedRanges(target.state).between(0, NOTE.length, () => {
			folded += 1;
		});
		expect(folded).toBe(0);
	});
});

describe('scrolling', () => {
	it('scrolls the cursor into view after zooming', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		zoomIn(target);
		expect(target.dispatched.at(-1)?.scrollIntoView).toBe(true);
	});
});

describe('cursor handling', () => {
	it('keeps a cursor that is inside the new zoom where it is', () => {
		const target = new FakeZoomTarget(NOTE, at('c') + 1);
		zoomIn(target);
		expect(target.caret).toBe(at('c') + 1);
	});

	it('moves a cursor that is below the zoom to its end when stepping back into it', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		zoomIn(target);
		zoomReset(target);
		target.dispatch({ selection: { anchor: at('d') } });
		stepHistory(target, 'back');
		expect(target.caret).toBe(target.zoom?.to);
	});

	it('clamps ranges to the zoom, keeps the main range and its direction', () => {
		const zoom = { from: 10, to: 20, crumbs: [] };
		const selection = EditorSelection.create(
			[EditorSelection.range(0, 5), EditorSelection.range(25, 12)],
			1,
		);
		const clamped = clampSelection(selection, zoom);
		expect(clamped.ranges.map((range) => [range.anchor, range.head])).toEqual([
			[10, 10],
			[20, 12],
		]);
		expect(clamped.mainIndex).toBe(1);
	});
});

describe('stepHistory', () => {
	const visited = () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		zoomIn(target);
		target.dispatch({ selection: { anchor: at('c') } });
		zoomIn(target);
		return target;
	};

	it('has nothing to step to before any zoom', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		expect(canStep(target, 'back')).toBe(false);
		expect(canStep(target, 'forward')).toBe(false);
	});

	it('steps back to the previous zoom and forward again', () => {
		const target = visited();
		expect(canStep(target, 'back')).toBe(true);
		expect(stepHistory(target, 'back')).toBe('done');
		expect(crumbTexts(target)).toEqual(['a']);
		expect(canStep(target, 'forward')).toBe(true);
		stepHistory(target, 'forward');
		expect(crumbTexts(target)).toEqual(['a', 'b', 'c']);
	});

	it('steps back to the whole note', () => {
		const target = visited();
		stepHistory(target, 'back');
		stepHistory(target, 'back');
		expect(target.zoom).toBeNull();
		expect(canStep(target, 'back')).toBe(false);
	});

	it('falls back to the whole note when the item was removed', () => {
		const target = visited();
		target.dispatch({ changes: { from: at('a') - 2, to: at('a') + 1, insert: '' } });
		const outcome = stepHistory(target, 'back');
		expect(outcome).toBe('item-removed');
		expect(target.zoom).toBeNull();
	});
});

describe('zoomTargetOf', () => {
	it('returns the editor view when the zoom extension is active', () => {
		const view = new FakeZoomTarget(NOTE, 0);
		expect(zoomTargetOf({ cm: view })).toBe(view);
	});

	it.each([
		['an editor without a view', {}],
		[
			'a view without dispatch',
			{ cm: { state: EditorState.create({ doc: '', extensions: [zoomField] }) } },
		],
		['a view without a state', { cm: { dispatch: (): void => undefined } }],
		[
			'a view without the zoom extension',
			{ cm: { dispatch: (): void => undefined, state: EditorState.create({ doc: '' }) } },
		],
	])('returns null for %s', (_name, editor) => {
		expect(zoomTargetOf(editor)).toBeNull();
	});

	it('is the same field the extension adds', () => {
		expect(new FakeZoomTarget(NOTE, 0).state.field(zoomField, false)).toBeNull();
	});
});
