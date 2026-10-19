import { describe, expect, it } from 'vitest';
import { duplicateItem } from '../../src/editor/duplicate-item';
import { toggleBranch } from '../../src/editor/fold-control';
import { dispatchZoom } from '../../src/editor/zoom-control';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['- a', '  - b', '- c ^id'].join('\n');

describe('duplicateItem', () => {
	it('inserts a copy of the subtree below it and puts the caret on the copy', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		expect(duplicateItem(target, 0)).toEqual({ ok: true });
		expect(target.text).toBe(['- a', '  - b', '- a', '  - b', '- c ^id'].join('\n'));
		expect(target.caret).toBe('- a\n  - b\n- a'.length);
	});

	it('copies the last item without its block id', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		duplicateItem(target, 2);
		expect(target.text).toBe(['- a', '  - b', '- c ^id', '- c'].join('\n'));
	});

	it('keeps the copy inside the zoom', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		dispatchZoom(target, 0, 'visit');
		duplicateItem(target, 0);
		expect(target.zoom?.to).toBe(['- a', '  - b', '- a', '  - b'].join('\n').length);
	});

	it('copies a folded item with its hidden children', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		toggleBranch(target, 0, false);
		duplicateItem(target, 0);
		expect(target.text).toBe(['- a', '  - b', '- a', '  - b', '- c ^id'].join('\n'));
	});

	it('refuses a line that is not an item', () => {
		const target = new FakeZoomTarget('text', 0);
		expect(duplicateItem(target, 0)).toEqual({ ok: false, reason: 'not-a-list-item' });
		expect(target.dispatched).toEqual([]);
	});
});
