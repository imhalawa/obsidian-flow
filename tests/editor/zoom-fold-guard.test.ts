import { foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language';
import { describe, expect, it } from 'vitest';
import { unfoldingHiders } from '../../src/editor/zoom-fold-guard';
import { zoomChange } from '../../src/editor/zoom-field';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['intro', '- a', '  - b', '    - c', '  - d', '- e', '  - f'].join('\n');
const endOfLine = (line: number) =>
	NOTE.split('\n')
		.slice(0, line + 1)
		.join('\n').length;

const foldStarts = (target: FakeZoomTarget) => {
	const starts: number[] = [];
	foldedRanges(target.state).between(0, target.state.doc.length, (from) => {
		starts.push(from);
	});
	return starts;
};

const zoomedInto = (startLine: number) => {
	const target = new FakeZoomTarget(NOTE, 0);
	target.dispatch({ effects: zoomChange.of({ startLine, navigation: 'visit' }) });
	return target;
};

describe('zoomFoldGuard', () => {
	it('drops a fold that would hide the zoomed item and keeps the others', () => {
		const target = zoomedInto(3);
		target.dispatch({
			effects: [
				foldEffect.of({ from: endOfLine(1), to: endOfLine(4) }),
				foldEffect.of({ from: endOfLine(3), to: endOfLine(3) + 1 }),
			],
		});
		expect(foldStarts(target)).toEqual([endOfLine(3)]);
	});

	it('lets folds inside the zoomed item through', () => {
		const target = zoomedInto(2);
		target.dispatch({ effects: foldEffect.of({ from: endOfLine(2), to: endOfLine(3) }) });
		expect(foldStarts(target)).toEqual([endOfLine(2)]);
	});

	it('lets any fold through when nothing is zoomed', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		target.dispatch({ effects: foldEffect.of({ from: endOfLine(1), to: endOfLine(4) }) });
		expect(foldStarts(target)).toEqual([endOfLine(1)]);
	});

	it('keeps the user event and the selection of the transaction it rewrites', () => {
		const target = zoomedInto(3);
		target.dispatch({
			effects: foldEffect.of({ from: endOfLine(1), to: endOfLine(4) }),
			selection: { anchor: endOfLine(3) },
			userEvent: 'fold',
		});
		expect(target.caret).toBe(endOfLine(3));
	});

	it('lets unfolding through', () => {
		const target = zoomedInto(3);
		target.dispatch({ effects: unfoldEffect.of({ from: 0, to: 1 }) });
		expect(foldStarts(target)).toEqual([]);
	});
});

describe('unfoldingHiders', () => {
	it('lists the folds that cover a position', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		target.dispatch({
			effects: [
				foldEffect.of({ from: endOfLine(1), to: endOfLine(4) }),
				foldEffect.of({ from: endOfLine(5), to: endOfLine(6) }),
			],
		});
		const position = endOfLine(2) + 1;
		expect(unfoldingHiders(target.state, position)).toHaveLength(1);
	});

	it('leaves out folds that end before the position or start at it', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		target.dispatch({ effects: foldEffect.of({ from: endOfLine(1), to: endOfLine(2) }) });
		expect(unfoldingHiders(target.state, endOfLine(2) + 2)).toHaveLength(0);
		expect(unfoldingHiders(target.state, endOfLine(1))).toHaveLength(0);
	});
});
