import { describe, expect, it } from 'vitest';
import { MAX_REMEMBERED_NOTES, ZoomMemory } from '../../src/editor/zoom-memory';

const anchor = (text: string) => [{ text, nth: 0 }];

class FakeStorage {
	writes: unknown[] = [];
	constructor(private current: unknown) {}
	read(): unknown {
		return this.current;
	}
	write(data: unknown): void {
		this.current = data;
		this.writes.push(data);
	}
}

const memoryWith = (initial: unknown, enabled = true) => {
	const storage = new FakeStorage(initial);
	let now = 0;
	const memory = new ZoomMemory(
		storage,
		() => (now += 1),
		() => enabled,
	);
	return { storage, memory };
};

describe('ZoomMemory', () => {
	it('recalls nothing for a note it has not seen', () => {
		expect(memoryWith(null).memory.recall('a.md')).toBeNull();
	});

	it('recalls what was remembered', () => {
		const { memory } = memoryWith(null);
		memory.remember('a.md', anchor('x'));
		expect(memory.recall('a.md')).toEqual(anchor('x'));
	});

	it('writes every change to storage', () => {
		const { memory, storage } = memoryWith(null);
		memory.remember('a.md', anchor('x'));
		expect(storage.read()).toEqual({ 'a.md': { anchor: anchor('x'), usedAt: 1 } });
	});

	it('survives a restart by reading storage again', () => {
		const { memory, storage } = memoryWith(null);
		memory.remember('a.md', anchor('x'));
		const restarted = new ZoomMemory(
			storage,
			() => 0,
			() => true,
		);
		expect(restarted.recall('a.md')).toEqual(anchor('x'));
	});

	it('ignores malformed stored data', () => {
		expect(memoryWith('garbage').memory.recall('a.md')).toBeNull();
	});

	it('forgets a note when remembering a null anchor', () => {
		const { memory } = memoryWith(null);
		memory.remember('a.md', anchor('x'));
		memory.remember('a.md', null);
		expect(memory.recall('a.md')).toBeNull();
	});

	it('counts a recall as a use', () => {
		const { memory, storage } = memoryWith(null);
		memory.remember('a.md', anchor('x'));
		memory.recall('a.md');
		expect(storage.read()).toEqual({ 'a.md': { anchor: anchor('x'), usedAt: 2 } });
	});

	it('does not write when recalling an unknown note', () => {
		const { memory, storage } = memoryWith(null);
		memory.recall('a.md');
		expect(storage.writes).toEqual([]);
	});

	it('moves a renamed note and forgets a deleted one', () => {
		const { memory } = memoryWith(null);
		memory.remember('a.md', anchor('x'));
		memory.remember('b.md', anchor('y'));
		memory.rename('a.md', 'c.md');
		memory.forget('b.md');
		expect(memory.recall('c.md')).toEqual(anchor('x'));
		expect(memory.recall('a.md')).toBeNull();
		expect(memory.recall('b.md')).toBeNull();
	});

	it('keeps only the most recently used notes', () => {
		const { memory } = memoryWith(null);
		for (let note = 0; note <= MAX_REMEMBERED_NOTES; note += 1) {
			memory.remember(`n${note}.md`, anchor('x'));
		}
		expect(memory.recall('n0.md')).toBeNull();
		expect(memory.recall(`n${MAX_REMEMBERED_NOTES}.md`)).toEqual(anchor('x'));
	});

	it('reports whether remembering is switched on', () => {
		expect(memoryWith(null, true).memory.enabled()).toBe(true);
		expect(memoryWith(null, false).memory.enabled()).toBe(false);
	});
});
