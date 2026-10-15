import { itemAtLine } from './item-lookup';
import { parseOutline, type OutlineNode } from './outline-tree';
import type { ZoomRange } from './zoom';

export interface FoldSpan {
	fromLine: number;
	toLine: number;
}

export type FoldLookup =
	{ kind: 'span'; span: FoldSpan } | { kind: 'not-a-list-item' } | { kind: 'no-children' };

/** Returns the lines a fold of an item covers, from its first line to its subtree end. */
function spanOf(item: OutlineNode): FoldSpan {
	return { fromLine: item.startLine, toLine: item.endLine };
}

/** Finds the fold of the deepest item at a cursor line. */
export function foldLookup(
	lines: readonly string[],
	tabSize: number,
	cursorLine: number,
): FoldLookup {
	const item = itemAtLine(parseOutline(lines, tabSize), cursorLine);
	if (!item) return { kind: 'not-a-list-item' };
	if (item.children.length === 0) return { kind: 'no-children' };
	return { kind: 'span', span: spanOf(item) };
}

/** Returns the folds of every item with children that starts inside a range of lines. */
export function allFoldSpans(
	lines: readonly string[],
	tabSize: number,
	within: ZoomRange,
): FoldSpan[] {
	return parseOutline(lines, tabSize)
		.nodes.filter(
			(item) =>
				item.children.length > 0 &&
				item.startLine >= within.fromLine &&
				item.endLine <= within.toLine,
		)
		.map(spanOf);
}
