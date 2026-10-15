import type { Anchor, AnchorSegment } from './zoom-anchor';

export interface StoredZoom {
	anchor: Anchor;
	usedAt: number;
}

export type ZoomStore = Readonly<Record<string, StoredZoom>>;

export const EMPTY_STORE: ZoomStore = {};

/** Tells whether a path is the given path or lies inside it as a folder. */
function isAtOrInside(path: string, base: string): boolean {
	return path === base || path.startsWith(`${base}/`);
}

/** Records the zoom of a note and drops the least recently used notes beyond the limit. */
export function rememberZoom(
	store: ZoomStore,
	path: string,
	anchor: Anchor,
	usedAt: number,
	maxNotes: number,
): ZoomStore {
	const entries = Object.entries({ ...store, [path]: { anchor, usedAt } });
	entries.sort(([, a], [, b]) => b.usedAt - a.usedAt);
	return Object.fromEntries(entries.slice(0, maxNotes));
}

/** Removes the zoom of a note, or of every note inside a folder of that path. */
export function forgetZoom(store: ZoomStore, path: string): ZoomStore {
	return Object.fromEntries(Object.entries(store).filter(([key]) => !isAtOrInside(key, path)));
}

/** Moves the zoom of a note, or of every note inside a folder, to its new path. */
export function renameZoom(store: ZoomStore, oldPath: string, newPath: string): ZoomStore {
	return Object.fromEntries(
		Object.entries(store).map(([key, value]) => [
			isAtOrInside(key, oldPath) ? newPath + key.slice(oldPath.length) : key,
			value,
		]),
	);
}

/** Tells whether a value is one anchor segment. */
function isSegment(value: unknown): value is AnchorSegment {
	if (typeof value !== 'object' || value === null) return false;
	const { text, nth } = value as Record<string, unknown>;
	return typeof text === 'string' && typeof nth === 'number' && Number.isInteger(nth) && nth >= 0;
}

/** Tells whether a value is a stored zoom. */
function isStoredZoom(value: unknown): value is StoredZoom {
	if (typeof value !== 'object' || value === null) return false;
	const { anchor, usedAt } = value as Record<string, unknown>;
	return (
		typeof usedAt === 'number' &&
		Array.isArray(anchor) &&
		anchor.length > 0 &&
		anchor.every(isSegment)
	);
}

/** Reads stored data back into a store and drops anything malformed. */
export function parseStore(raw: unknown): ZoomStore {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return EMPTY_STORE;
	return Object.fromEntries(Object.entries(raw).filter(([, value]) => isStoredZoom(value)));
}
