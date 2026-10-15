import type { OutlineNode } from './outline-tree';

export interface ZoomRange {
	fromLine: number;
	toLine: number;
}

export interface Breadcrumb {
	text: string;
	startLine: number;
}

/** Returns the lines shown when zoomed into an item: the item and its subtree. */
export function zoomRange(item: OutlineNode): ZoomRange {
	return { fromLine: item.startLine, toLine: item.endLine };
}

/** Returns the path from the top level item down to the item itself. */
export function breadcrumbs(item: OutlineNode): Breadcrumb[] {
	const path: Breadcrumb[] = [];
	for (let up: OutlineNode | null = item; up; up = up.parent) {
		path.unshift({ text: up.text, startLine: up.startLine });
	}
	return path;
}

/** Returns the item to zoom into when zooming out one level, or null for the full note. */
export function zoomOutTarget(item: OutlineNode): OutlineNode | null {
	return item.parent;
}

/** Returns the line ranges that are hidden while a range is zoomed. */
export function hiddenRanges(totalLines: number, shown: ZoomRange): ZoomRange[] {
	const hidden: ZoomRange[] = [];
	if (shown.fromLine > 0) hidden.push({ fromLine: 0, toLine: shown.fromLine - 1 });
	if (shown.toLine < totalLines - 1)
		hidden.push({ fromLine: shown.toLine + 1, toLine: totalLines - 1 });
	return hidden;
}
