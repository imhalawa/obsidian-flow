import { describe, expect, it } from 'vitest';
import { stepZoomHistory } from '../../src/editor/zoom-history-step';
import { dispatchZoom } from '../../src/editor/zoom-control';
import { ZOOM_REMOVED_MESSAGE } from '../../src/ui/zoom-messages';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['intro', '- a', '  - b', '- c'].join('\n');

const zoomedTwice = () => {
	const target = new FakeZoomTarget(NOTE, 0);
	dispatchZoom(target, 1, 'visit');
	dispatchZoom(target, 2, 'visit');
	return target;
};

describe('stepZoomHistory', () => {
	it('steps back and says so', () => {
		const target = zoomedTwice();
		const messages: string[] = [];
		expect(stepZoomHistory(target, 'back', (message) => messages.push(message))).toBe(true);
		expect(target.zoom?.crumbs.map((crumb) => crumb.text)).toEqual(['a']);
		expect(messages).toEqual([]);
	});

	it('steps forward after stepping back', () => {
		const target = zoomedTwice();
		stepZoomHistory(target, 'back', () => undefined);
		expect(stepZoomHistory(target, 'forward', () => undefined)).toBe(true);
		expect(target.zoom?.crumbs.map((crumb) => crumb.text)).toEqual(['a', 'b']);
	});

	it('reports that it cannot move when there is no entry in that direction', () => {
		const target = zoomedTwice();
		expect(stepZoomHistory(target, 'forward', () => undefined)).toBe(false);
	});

	it('reports that it cannot move without an editor', () => {
		expect(stepZoomHistory(null, 'back', () => undefined)).toBe(false);
	});

	it('explains when the item of the entry was removed', () => {
		const target = zoomedTwice();
		target.dispatch({ changes: { from: 0, to: target.state.doc.length, insert: 'gone' } });
		const messages: string[] = [];
		expect(stepZoomHistory(target, 'back', (message) => messages.push(message))).toBe(true);
		expect(messages).toEqual([ZOOM_REMOVED_MESSAGE]);
	});
});
