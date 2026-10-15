import { describe, expect, it } from 'vitest';
import { ensureBlockId, ensureBlockIdOnLine } from '../../src/editor/block-link';
import { zoomIn } from '../../src/editor/zoom-control';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['intro', '- a', '  more', '  - b', '- c ^taken'].join('\n');
const at = (text: string) => NOTE.indexOf(text);
const halfway = () => 0.5;

describe('ensureBlockId', () => {
	it('appends a new id to an item without one', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		expect(ensureBlockId(target, halfway)).toEqual({
			kind: 'item',
			id: 'i00000',
			added: true,
			duplicate: false,
		});
		expect(target.text).toBe(NOTE.replace('- b', '- b ^i00000'));
	});

	it('puts the id on the last text line of a multi line item', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		ensureBlockId(target, halfway);
		expect(target.text).toBe(NOTE.replace('  more', '  more ^i00000'));
	});

	it('changes the note in one transaction that undo can take back as a unit', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		ensureBlockId(target, halfway);
		expect(target.dispatched).toHaveLength(1);
		expect(target.dispatched[0]?.userEvent).toBe('flow.block-id');
	});

	it('keeps the id it finds and changes nothing', () => {
		const target = new FakeZoomTarget(NOTE, at('c'));
		expect(ensureBlockId(target, halfway)).toEqual({
			kind: 'item',
			id: 'taken',
			added: false,
			duplicate: false,
		});
		expect(target.text).toBe(NOTE);
	});

	it('warns when the id it finds is used more than once', () => {
		const note = '- a ^x\n- b ^x';
		const outcome = ensureBlockId(new FakeZoomTarget(note, 0), halfway);
		expect(outcome).toMatchObject({ id: 'x', duplicate: true });
	});

	it('never reuses an id that is already in the note', () => {
		const note = '- a ^i00000\n- b';
		const target = new FakeZoomTarget(note, note.indexOf('b'));
		const draws = [0.5, 0.25];
		let call = 0;
		const outcome = ensureBlockId(target, () => draws[call++] ?? 0.25);
		expect(outcome).toMatchObject({ added: true, id: '900000' });
	});

	it('reports a cursor outside a list item', () => {
		const target = new FakeZoomTarget(NOTE, 1);
		expect(ensureBlockId(target, halfway)).toEqual({ kind: 'not-a-list-item' });
		expect(target.text).toBe(NOTE);
	});

	it('works inside a zoom', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		zoomIn(target);
		ensureBlockId(target, halfway);
		expect(target.text).toBe(NOTE.replace('- b', '- b ^i00000'));
	});
});

describe('ensureBlockIdOnLine', () => {
	it('gives the item on the given line an id wherever the cursor is', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		expect(ensureBlockIdOnLine(target, 3, halfway)).toMatchObject({
			id: 'i00000',
			added: true,
		});
		expect(target.text).toBe(NOTE.replace('- b', '- b ^i00000'));
	});

	it('reports a line that is not in a list item', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		expect(ensureBlockIdOnLine(target, 0, halfway)).toEqual({ kind: 'not-a-list-item' });
	});
});
