export interface ZoomHistory<T> {
	entries: readonly T[];
	index: number;
}

/** Starts a history on one entry. */
export function newHistory<T>(initial: T): ZoomHistory<T> {
	return { entries: [initial], index: 0 };
}

/** Returns the entry the history is on. */
export function currentEntry<T>(history: ZoomHistory<T>): T {
	return history.entries[history.index] as T;
}

/** Tells whether there is an earlier entry. */
export function canGoBack<T>(history: ZoomHistory<T>): boolean {
	return history.index > 0;
}

/** Tells whether there is a later entry. */
export function canGoForward<T>(history: ZoomHistory<T>): boolean {
	return history.index < history.entries.length - 1;
}

/** Moves to the earlier entry, or returns the same history when there is none. */
export function goBack<T>(history: ZoomHistory<T>): ZoomHistory<T> {
	return canGoBack(history) ? { entries: history.entries, index: history.index - 1 } : history;
}

/** Moves to the later entry, or returns the same history when there is none. */
export function goForward<T>(history: ZoomHistory<T>): ZoomHistory<T> {
	return canGoForward(history) ? { entries: history.entries, index: history.index + 1 } : history;
}

/** Records a visit, dropping later entries and the oldest ones beyond the limit. */
export function visit<T>(
	history: ZoomHistory<T>,
	entry: T,
	isSame: (a: T, b: T) => boolean,
	maxEntries: number,
): ZoomHistory<T> {
	if (isSame(currentEntry(history), entry)) return history;
	const kept = [...history.entries.slice(0, history.index + 1), entry].slice(-maxEntries);
	return { entries: kept, index: kept.length - 1 };
}
