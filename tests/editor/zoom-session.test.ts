import { EditorState } from '@codemirror/state';
import { beforeEach, describe, expect, it } from 'vitest';
import { zoomIn, zoomReset } from '../../src/editor/zoom-control';
import type { ZoomMemoryPort } from '../../src/editor/zoom-memory';
import { SAVE_DELAY_MS, ZoomSession, type SessionTimers } from '../../src/editor/zoom-session';
import type { Anchor } from '../../src/outline/zoom-anchor';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['intro', '- a', '  - b', '    - c', '- d'].join('\n');
const at = (text: string) => NOTE.indexOf(text);
const PATH = 'note.md';

class FakeMemory implements ZoomMemoryPort {
	isOn = true;
	stored = new Map<string, Anchor>();
	recalls: string[] = [];
	enabled(): boolean {
		return this.isOn;
	}
	recall(path: string): Anchor | null {
		this.recalls.push(path);
		return this.stored.get(path) ?? null;
	}
	remember(path: string, anchor: Anchor | null): void {
		if (anchor) this.stored.set(path, anchor);
		else this.stored.delete(path);
	}
}

class FakeTimers implements SessionTimers {
	deferred: (() => void)[] = [];
	scheduled = new Map<number, { task: () => void; delayMs: number }>();
	cancelled: number[] = [];
	private next = 1;
	defer(task: () => void): void {
		this.deferred.push(task);
	}
	later(task: () => void, delayMs: number): number {
		const id = this.next;
		this.next += 1;
		this.scheduled.set(id, { task, delayMs });
		return id;
	}
	cancel(id: number): void {
		this.cancelled.push(id);
		this.scheduled.delete(id);
	}
	runDeferred(): void {
		const tasks = this.deferred;
		this.deferred = [];
		for (const task of tasks) task();
	}
	runScheduled(): void {
		const tasks = [...this.scheduled.values()];
		this.scheduled.clear();
		for (const { task } of tasks) task();
	}
}

const crumbs = (target: FakeZoomTarget) => target.zoom?.crumbs.map((crumb) => crumb.text);

let memory: FakeMemory;
let timers: FakeTimers;

beforeEach(() => {
	memory = new FakeMemory();
	timers = new FakeTimers();
});

const sessionFor = (target: FakeZoomTarget) => {
	const session = new ZoomSession(target, PATH, memory, timers);
	target.onUpdate((before, after, transactions) =>
		session.afterUpdate(before, after, transactions),
	);
	return session;
};

const anchorOfBC = [
	{ text: 'a', nth: 0 },
	{ text: 'b', nth: 0 },
];

describe('ZoomSession restore', () => {
	it('zooms into the remembered item once the note is ready', () => {
		memory.stored.set(PATH, anchorOfBC);
		const target = new FakeZoomTarget(NOTE, 0);
		sessionFor(target).start();
		expect(target.zoom).toBeNull();
		timers.runDeferred();
		expect(crumbs(target)).toEqual(['a', 'b']);
	});

	it('does nothing for a note with nothing remembered', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		sessionFor(target).start();
		timers.runDeferred();
		expect(target.zoom).toBeNull();
	});

	it('shows the whole note when the remembered item is gone', () => {
		memory.stored.set(PATH, [...anchorOfBC, { text: 'gone', nth: 0 }]);
		const target = new FakeZoomTarget(NOTE, 0);
		sessionFor(target).start();
		timers.runDeferred();
		expect(target.zoom).toBeNull();
	});

	it('shows the whole note when no part of the anchor matches', () => {
		memory.stored.set(PATH, [{ text: 'nowhere', nth: 0 }]);
		const target = new FakeZoomTarget(NOTE, 0);
		sessionFor(target).start();
		timers.runDeferred();
		expect(target.zoom).toBeNull();
	});

	it('waits for the note to get content', () => {
		memory.stored.set(PATH, anchorOfBC);
		const target = new FakeZoomTarget('', 0);
		sessionFor(target).start();
		expect(timers.deferred).toHaveLength(0);
		target.dispatch({ changes: { from: 0, insert: NOTE } });
		expect(timers.deferred).toHaveLength(1);
		timers.runDeferred();
		expect(crumbs(target)).toEqual(['a', 'b']);
	});

	it('queues one restore however many updates arrive first', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		sessionFor(target).start();
		target.dispatch({ selection: { anchor: 1 } });
		target.dispatch({ selection: { anchor: 2 } });
		expect(timers.deferred).toHaveLength(1);
	});

	it('restores only once', () => {
		memory.stored.set(PATH, anchorOfBC);
		const target = new FakeZoomTarget(NOTE, 0);
		sessionFor(target).start();
		timers.runDeferred();
		zoomReset(target);
		memory.stored.set(PATH, anchorOfBC);
		target.dispatch({ selection: { anchor: 1 } });
		timers.runDeferred();
		expect(target.zoom).toBeNull();
	});

	it('keeps a zoom the user made before the restore ran', () => {
		memory.stored.set(PATH, anchorOfBC);
		const target = new FakeZoomTarget(NOTE, at('d'));
		sessionFor(target).start();
		zoomIn(target);
		memory.stored.set(PATH, anchorOfBC);
		timers.runDeferred();
		expect(crumbs(target)).toEqual(['d']);
	});

	it('does nothing while remembering is switched off', () => {
		memory.stored.set(PATH, anchorOfBC);
		memory.isOn = false;
		const target = new FakeZoomTarget(NOTE, 0);
		const session = sessionFor(target);
		session.start();
		timers.runDeferred();
		target.dispatch({ selection: { anchor: 1 } });
		expect(timers.deferred).toHaveLength(0);
		expect(target.zoom).toBeNull();
		expect(memory.recalls).toEqual([]);
	});

	it('does not restore into a view that was destroyed', () => {
		memory.stored.set(PATH, anchorOfBC);
		const target = new FakeZoomTarget(NOTE, 0);
		const session = sessionFor(target);
		session.start();
		session.destroy();
		timers.runDeferred();
		expect(target.zoom).toBeNull();
	});
});

describe('ZoomSession remember', () => {
	const settledSession = (target: FakeZoomTarget) => {
		const session = sessionFor(target);
		session.start();
		timers.runDeferred();
		return session;
	};

	it('remembers a zoom the moment the user makes it', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		settledSession(target);
		zoomIn(target);
		expect(memory.stored.get(PATH)).toEqual(anchorOfBC);
	});

	it('forgets the note when the user shows the whole note', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		settledSession(target);
		zoomIn(target);
		zoomReset(target);
		expect(memory.stored.has(PATH)).toBe(false);
	});

	it('forgets the note when the zoomed item is removed', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		settledSession(target);
		zoomIn(target);
		const from = target.zoom?.from ?? 0;
		target.dispatch({ changes: { from, to: from + 4, insert: 'text' } });
		expect(memory.stored.has(PATH)).toBe(false);
	});

	it('cancels a pending save when the zoomed item is removed', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		settledSession(target);
		zoomIn(target);
		target.dispatch({ changes: { from: at('b') + 1, insert: 'x' } });
		const from = target.zoom?.from ?? 0;
		target.dispatch({ changes: { from, to: from + 4, insert: 'text' } });
		expect(timers.scheduled.size).toBe(0);
		expect(timers.cancelled).toHaveLength(1);
	});

	it('remembers edits inside the zoom after a short pause', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		settledSession(target);
		zoomIn(target);
		target.dispatch({ changes: { from: at('b') + 1, insert: 'x' } });
		expect(memory.stored.get(PATH)?.[1]?.text).toBe('b');
		expect([...timers.scheduled.values()].map((entry) => entry.delayMs)).toEqual([
			SAVE_DELAY_MS,
		]);
		timers.runScheduled();
		expect(memory.stored.get(PATH)?.[1]?.text).toBe('bx');
	});

	it('restarts the pause while the user keeps typing', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		settledSession(target);
		zoomIn(target);
		target.dispatch({ changes: { from: at('b') + 1, insert: 'x' } });
		target.dispatch({ changes: { from: at('b') + 2, insert: 'y' } });
		expect(timers.cancelled).toHaveLength(1);
		expect(timers.scheduled.size).toBe(1);
	});

	it('does not remember edits made without a zoom', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		settledSession(target);
		target.dispatch({ changes: { from: 0, insert: 'x' } });
		expect(timers.scheduled.size).toBe(0);
	});

	it('does not remember anything while remembering is switched off', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		settledSession(target);
		memory.isOn = false;
		zoomIn(target);
		expect(memory.stored.has(PATH)).toBe(false);
	});

	it('saves a pending change when the view goes away', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		const session = settledSession(target);
		zoomIn(target);
		target.dispatch({ changes: { from: at('b') + 1, insert: 'x' } });
		session.destroy();
		expect(memory.stored.get(PATH)?.[1]?.text).toBe('bx');
		expect(timers.scheduled.size).toBe(0);
	});

	it('does not save again when the view goes away without a pending change', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		const session = settledSession(target);
		zoomIn(target);
		memory.stored.clear();
		session.destroy();
		expect(memory.stored.size).toBe(0);
	});

	it('keeps what is remembered when the zoom extension is removed from the view', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		const session = settledSession(target);
		zoomIn(target);
		target.dispatch({ changes: { from: at('b') + 1, insert: 'x' } });
		memory.stored.set(PATH, anchorOfBC);
		target.state = EditorState.create({ doc: NOTE });
		expect(() => session.destroy()).not.toThrow();
		expect(memory.stored.get(PATH)).toEqual(anchorOfBC);
	});
});
