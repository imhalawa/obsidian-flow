import { itemsOfNote, type IndexedItem } from '../outline/item-search';

export interface IndexedFile {
	path: string;
	mtime: number;
	live: boolean;
}

export interface IndexSource {
	files(): IndexedFile[];
	read(path: string): Promise<string>;
	tabSize(): number;
}

interface CachedNote {
	mtime: number;
	items: IndexedItem[];
}

/** Lists the items of all notes, reading a note again only when it changed. */
export class ItemIndex {
	private cache = new Map<string, CachedNote>();
	private lists: IndexedItem[][] = [];
	private flat: IndexedItem[] = [];

	constructor(private readonly source: IndexSource) {}

	/** Returns the items of every note in the order the source lists its files, as the same array while no note changed. */
	async items(): Promise<IndexedItem[]> {
		const files = this.source.files();
		const fresh = new Map<string, CachedNote>();
		const lists = await Promise.all(files.map((file) => this.itemsOf(file, fresh)));
		this.cache = fresh;
		if (
			lists.length === this.lists.length &&
			lists.every((list, i) => list === this.lists[i])
		) {
			return this.flat;
		}
		this.lists = lists;
		this.flat = lists.flat();
		return this.flat;
	}

	private async itemsOf(
		file: IndexedFile,
		fresh: Map<string, CachedNote>,
	): Promise<IndexedItem[]> {
		const cached = this.cache.get(file.path);
		if (!file.live && cached && cached.mtime === file.mtime) {
			fresh.set(file.path, cached);
			return cached.items;
		}
		try {
			const text = await this.source.read(file.path);
			const items = itemsOfNote(file.path, text, this.source.tabSize());
			if (!file.live) fresh.set(file.path, { mtime: file.mtime, items });
			return items;
		} catch {
			return [];
		}
	}
}
