import { describe, expect, it } from 'vitest';
import { ItemIndex, type IndexSource } from '../../src/editor/item-index';

class FakeSource implements IndexSource {
	readonly notes = new Map<string, { mtime: number; text: string }>();
	readonly reads: string[] = [];
	failing = new Set<string>();

	files() {
		return [...this.notes].map(([path, note]) => ({ path, mtime: note.mtime }));
	}

	async read(path: string): Promise<string> {
		this.reads.push(path);
		if (this.failing.has(path)) throw new Error('unreadable');
		return this.notes.get(path)?.text ?? '';
	}

	tabSize(): number {
		return 4;
	}
}

const texts = async (index: ItemIndex) => (await index.items()).map((item) => item.text);

describe('ItemIndex', () => {
	it('lists the items of every note in the order of the files', async () => {
		const source = new FakeSource();
		source.notes.set('a.md', { mtime: 1, text: '- one\n- two' });
		source.notes.set('b.md', { mtime: 1, text: '- three' });
		expect(await texts(new ItemIndex(source))).toEqual(['one', 'two', 'three']);
	});

	it('keeps the path of each item', async () => {
		const source = new FakeSource();
		source.notes.set('a.md', { mtime: 1, text: '- one' });
		expect((await new ItemIndex(source).items())[0]?.path).toBe('a.md');
	});

	it('does not read a note again while its modified time is the same', async () => {
		const source = new FakeSource();
		source.notes.set('a.md', { mtime: 1, text: '- one' });
		const index = new ItemIndex(source);
		await index.items();
		await index.items();
		expect(source.reads).toEqual(['a.md']);
	});

	it('returns the same array while no note changed', async () => {
		const source = new FakeSource();
		source.notes.set('a.md', { mtime: 1, text: '- one' });
		const index = new ItemIndex(source);
		expect(await index.items()).toBe(await index.items());
	});

	it('returns a new array when a note is added', async () => {
		const source = new FakeSource();
		source.notes.set('a.md', { mtime: 1, text: '- one' });
		const index = new ItemIndex(source);
		const before = await index.items();
		source.notes.set('b.md', { mtime: 1, text: '- two' });
		const after = await index.items();
		expect(after).not.toBe(before);
		expect(after.map((item) => item.text)).toEqual(['one', 'two']);
	});

	it('reads a note again when its modified time changes', async () => {
		const source = new FakeSource();
		source.notes.set('a.md', { mtime: 1, text: '- one' });
		const index = new ItemIndex(source);
		await index.items();
		source.notes.set('a.md', { mtime: 2, text: '- changed' });
		expect(await texts(index)).toEqual(['changed']);
	});

	it('forgets notes that are gone', async () => {
		const source = new FakeSource();
		source.notes.set('a.md', { mtime: 1, text: '- one' });
		const index = new ItemIndex(source);
		await index.items();
		source.notes.delete('a.md');
		expect(await texts(index)).toEqual([]);
		source.notes.set('a.md', { mtime: 1, text: '- one' });
		await index.items();
		expect(source.reads).toEqual(['a.md', 'a.md']);
	});

	it('skips a note that cannot be read and tries it again next time', async () => {
		const source = new FakeSource();
		source.notes.set('a.md', { mtime: 1, text: '- one' });
		source.notes.set('b.md', { mtime: 1, text: '- two' });
		source.failing.add('a.md');
		const index = new ItemIndex(source);
		expect(await texts(index)).toEqual(['two']);
		source.failing.clear();
		expect(await texts(index)).toEqual(['one', 'two']);
	});
});
