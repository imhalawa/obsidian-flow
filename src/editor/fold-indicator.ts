import type { EditorView } from '@codemirror/view';

const FOLD_INDICATOR = '.cm-fold-indicator';

interface ClosestSearch {
	closest: (selector: string) => unknown;
}

/** Tells whether an event target lies inside the fold arrow that Obsidian draws beside an item. */
export function isOverFoldIndicator(target: object | null): boolean {
	if (target === null || !('closest' in target)) return false;
	return (target as ClosestSearch).closest(FOLD_INDICATOR) !== null;
}

/** Returns the rendered line that holds a document position, or null when it is not drawn. */
function renderedLine(view: EditorView, position: number): Element | null {
	const node = view.domAtPos(position).node;
	const element = node instanceof Element ? node : node.parentElement;
	return element?.closest('.cm-line') ?? null;
}

/** Returns the fold arrow element Obsidian draws on a line, or null when the line shows none. */
export function foldIndicatorOf(view: EditorView, lineStart: number): Element | null {
	return renderedLine(view, lineStart)?.querySelector(FOLD_INDICATOR) ?? null;
}

/** Returns the horizontal middle of the fold arrow Obsidian draws on a line, or null when the line shows none. */
export function foldIndicatorCenter(view: EditorView, lineStart: number): number | null {
	const arrow = renderedLine(view, lineStart)?.querySelector(FOLD_INDICATOR + ' svg');
	if (!arrow) return null;
	const box = arrow.getBoundingClientRect();
	return (box.left + box.right) / 2;
}
