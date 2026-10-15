import { itemAtLine, itemStartingAt } from './item-lookup';
import { parseOutline } from './outline-tree';
import { breadcrumbs, zoomOutTarget, zoomRange, type Breadcrumb, type ZoomRange } from './zoom';

export interface ZoomView {
	range: ZoomRange;
	crumbs: Breadcrumb[];
}

/** Returns the range and breadcrumb path of the item that starts on a line, or null. */
export function resolveZoom(
	lines: readonly string[],
	tabSize: number,
	startLine: number,
): ZoomView | null {
	const item = itemStartingAt(parseOutline(lines, tabSize), startLine);
	return item ? { range: zoomRange(item), crumbs: breadcrumbs(item) } : null;
}

/** Returns the start line of the deepest item at a cursor line, or null when there is none. */
export function zoomInTarget(
	lines: readonly string[],
	tabSize: number,
	cursorLine: number,
): number | null {
	return itemAtLine(parseOutline(lines, tabSize), cursorLine)?.startLine ?? null;
}

/** Returns the start line of the parent item to zoom out to, or null for the whole note. */
export function zoomOutStart(
	lines: readonly string[],
	tabSize: number,
	startLine: number,
): number | null {
	const item = itemStartingAt(parseOutline(lines, tabSize), startLine);
	return item ? (zoomOutTarget(item)?.startLine ?? null) : null;
}
