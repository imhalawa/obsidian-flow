const FOLD_INDICATOR = '.cm-fold-indicator';

interface ClosestSearch {
	closest: (selector: string) => unknown;
}

/** Tells whether an event target lies inside the fold arrow that Obsidian draws beside an item. */
export function isOverFoldIndicator(target: object | null): boolean {
	if (target === null || !('closest' in target)) return false;
	return (target as ClosestSearch).closest(FOLD_INDICATOR) !== null;
}
