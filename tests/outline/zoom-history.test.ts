import { describe, expect, it } from 'vitest';
import {
	canGoBack,
	canGoForward,
	currentEntry,
	goBack,
	goForward,
	newHistory,
	visit,
} from '../../src/outline/zoom-history';

const same = (a: string, b: string) => a === b;

describe('zoom history', () => {
	it('starts at the initial entry with nowhere to go', () => {
		const history = newHistory('full');
		expect(currentEntry(history)).toBe('full');
		expect(canGoBack(history)).toBe(false);
		expect(canGoForward(history)).toBe(false);
	});

	it('records a visit and can go back to the entry before', () => {
		const history = visit(newHistory('full'), 'a', same, 10);
		expect(currentEntry(history)).toBe('a');
		expect(canGoBack(history)).toBe(true);
		expect(currentEntry(goBack(history))).toBe('full');
	});

	it('goes forward again after going back', () => {
		const back = goBack(visit(newHistory('full'), 'a', same, 10));
		expect(canGoForward(back)).toBe(true);
		expect(currentEntry(goForward(back))).toBe('a');
	});

	it('drops forward entries when visiting somewhere new after going back', () => {
		let history = visit(visit(newHistory('full'), 'a', same, 10), 'b', same, 10);
		history = visit(goBack(history), 'c', same, 10);
		expect(currentEntry(history)).toBe('c');
		expect(canGoForward(history)).toBe(false);
		expect(currentEntry(goBack(history))).toBe('a');
	});

	it('ignores a visit to the entry it is already on', () => {
		const history = visit(visit(newHistory('full'), 'a', same, 10), 'a', same, 10);
		expect(history.entries).toEqual(['full', 'a']);
	});

	it('stays put when it cannot go back or forward', () => {
		const history = newHistory('full');
		expect(goBack(history)).toBe(history);
		expect(goForward(history)).toBe(history);
	});

	it('forgets the oldest entries beyond the limit', () => {
		let history = newHistory('0');
		for (const entry of ['1', '2', '3']) history = visit(history, entry, same, 3);
		expect(history.entries).toEqual(['1', '2', '3']);
		expect(currentEntry(history)).toBe('3');
		expect(canGoBack(goBack(goBack(history)))).toBe(false);
	});

	it('does not change the history it is given', () => {
		const history = newHistory('full');
		visit(history, 'a', same, 10);
		expect(history.entries).toEqual(['full']);
	});
});
