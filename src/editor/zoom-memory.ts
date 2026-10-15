import type { Anchor } from '../outline/zoom-anchor';
import {
	forgetZoom,
	parseStore,
	rememberZoom,
	renameZoom,
	type ZoomStore,
} from '../outline/zoom-store';

export const MAX_REMEMBERED_NOTES = 200;

export interface ZoomStorage {
	read(): unknown;
	write(data: unknown): void;
}

export interface ZoomMemoryPort {
	enabled(): boolean;
	recall(path: string): Anchor | null;
	remember(path: string, anchor: Anchor | null): void;
}

/** Keeps the zoom of each note in persistent storage, with the most recently used notes first. */
export class ZoomMemory implements ZoomMemoryPort {
	private store: ZoomStore;

	constructor(
		private readonly storage: ZoomStorage,
		private readonly clock: () => number,
		private readonly isEnabled: () => boolean,
	) {
		this.store = parseStore(storage.read());
	}

	enabled(): boolean {
		return this.isEnabled();
	}

	/** Returns the remembered anchor of a note and counts the note as used. */
	recall(path: string): Anchor | null {
		const stored = this.store[path];
		if (!stored) return null;
		this.remember(path, stored.anchor);
		return stored.anchor;
	}

	/** Remembers the anchor of a note, or forgets the note when the anchor is null. */
	remember(path: string, anchor: Anchor | null): void {
		this.update(
			anchor
				? rememberZoom(this.store, path, anchor, this.clock(), MAX_REMEMBERED_NOTES)
				: forgetZoom(this.store, path),
		);
	}

	/** Moves what is remembered for a renamed note or folder. */
	rename(oldPath: string, newPath: string): void {
		this.update(renameZoom(this.store, oldPath, newPath));
	}

	/** Forgets a deleted note or folder. */
	forget(path: string): void {
		this.update(forgetZoom(this.store, path));
	}

	private update(next: ZoomStore): void {
		this.store = next;
		this.storage.write(next);
	}
}
