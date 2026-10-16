import { describe, expect, it } from 'vitest';
import {
	wrapHistory,
	type HistoryWindow,
	type HistoryWrapperHost,
} from '../../src/editor/history-wrapper';

type Direction = 'back' | 'forward';

class FakeHistoryWindow implements HistoryWindow {
	readonly calls: string[] = [];
	readonly history = {
		back: (): void => {
			this.calls.push('native back');
		},
		forward: (): void => {
			this.calls.push('native forward');
		},
	};
}

class FakeHost implements HistoryWrapperHost {
	enabled = true;
	moves = true;
	readonly steps: Direction[] = [];
	isEnabled(): boolean {
		return this.enabled;
	}
	step(direction: Direction): boolean {
		this.steps.push(direction);
		return this.moves;
	}
}

describe.each<Direction>(['back', 'forward'])('wrapHistory %s', (direction) => {
	const native = `native ${direction}`;

	it('swallows the call when the zoom history moves', () => {
		const win = new FakeHistoryWindow();
		const host = new FakeHost();
		wrapHistory(win, host);
		win.history[direction]();
		expect(host.steps).toEqual([direction]);
		expect(win.calls).toEqual([]);
	});

	it('lets Obsidian navigate when the zoom history cannot move', () => {
		const win = new FakeHistoryWindow();
		const host = new FakeHost();
		host.moves = false;
		wrapHistory(win, host);
		win.history[direction]();
		expect(win.calls).toEqual([native]);
	});

	it('lets Obsidian navigate without asking when the setting is off', () => {
		const win = new FakeHistoryWindow();
		const host = new FakeHost();
		host.enabled = false;
		wrapHistory(win, host);
		win.history[direction]();
		expect(host.steps).toEqual([]);
		expect(win.calls).toEqual([native]);
	});

	it('calls the original method on the history object itself', () => {
		const seen: unknown[] = [];
		const win: HistoryWindow = {
			history: {
				back(this: unknown) {
					seen.push(this);
				},
				forward(this: unknown) {
					seen.push(this);
				},
			},
		};
		const host = new FakeHost();
		host.moves = false;
		wrapHistory(win, host);
		win.history[direction]();
		expect(seen).toEqual([win.history]);
	});
});

describe('wrapHistory restore', () => {
	it('puts the original methods back', () => {
		const win = new FakeHistoryWindow();
		const original = { ...win.history };
		const restore = wrapHistory(win, new FakeHost());
		restore();
		expect(win.history.back).toBe(original.back);
		expect(win.history.forward).toBe(original.forward);
	});

	it('leaves a method alone when something else replaced it after the wrapper', () => {
		const win = new FakeHistoryWindow();
		const restore = wrapHistory(win, new FakeHost());
		const replacement = () => undefined;
		win.history.back = replacement;
		restore();
		expect(win.history.back).toBe(replacement);
	});

	it('wraps each window on its own', () => {
		const first = new FakeHistoryWindow();
		const second = new FakeHistoryWindow();
		const host = new FakeHost();
		host.moves = false;
		wrapHistory(first, host);
		second.history.back();
		expect(second.calls).toEqual(['native back']);
		expect(host.steps).toEqual([]);
	});
});

describe('wrapHistory feature check', () => {
	it.each<[string, object]>([
		['no history', {}],
		['history without methods', { history: {} }],
		['a history with only back', { history: { back: () => undefined } }],
		[
			'a history with a non function forward',
			{ history: { back: () => undefined, forward: 1 } },
		],
	])('does nothing for %s', (_name, win) => {
		const restore = wrapHistory(win as HistoryWindow, new FakeHost());
		expect(() => restore()).not.toThrow();
	});
});
