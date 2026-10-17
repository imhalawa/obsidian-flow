import { enclosingHeadings, parseHeadings, type Heading } from './headings';
import { itemAtLine, itemStartingAt } from './item-lookup';
import { parseOutline, type OutlineTree } from './outline-tree';
import { breadcrumbs, zoomOutTarget, zoomRange, type Breadcrumb, type ZoomRange } from './zoom';

export interface ZoomView {
	range: ZoomRange;
	crumbs: Breadcrumb[];
}

/** Returns the breadcrumb of a heading. */
function headingCrumb(heading: Heading): Breadcrumb {
	return { text: heading.text, startLine: heading.line };
}

/** Returns the breadcrumbs of the headings that hold a line, outermost first. */
function headingCrumbsAbove(headings: readonly Heading[], line: number): Breadcrumb[] {
	return enclosingHeadings(headings, line).map(headingCrumb);
}

/** Returns the range and breadcrumb path of the heading or item that starts on a line, or null. */
export function resolveZoom(
	lines: readonly string[],
	tree: OutlineTree,
	startLine: number,
): ZoomView | null {
	const headings = parseHeadings(lines);
	const heading = headings.find((candidate) => candidate.line === startLine);
	if (heading) {
		return {
			range: { fromLine: heading.line, toLine: heading.endLine },
			crumbs: [...headingCrumbsAbove(headings, heading.line), headingCrumb(heading)],
		};
	}
	const item = itemStartingAt(tree, startLine);
	if (!item) return null;
	return {
		range: zoomRange(item),
		crumbs: [...headingCrumbsAbove(headings, item.startLine), ...breadcrumbs(item)],
	};
}

/** Returns the start line of the deepest item or, failing that, the innermost heading section at a cursor line, or null when there is none. */
export function zoomInTarget(
	lines: readonly string[],
	tabSize: number,
	cursorLine: number,
): number | null {
	const item = itemAtLine(parseOutline(lines, tabSize), cursorLine);
	if (item) return item.startLine;
	const headings = parseHeadings(lines);
	const holding = headings.filter(
		(heading) => heading.line <= cursorLine && cursorLine <= heading.endLine,
	);
	return holding[holding.length - 1]?.line ?? null;
}

/** Returns the start line of the item or heading to zoom out to, or null for the whole note. */
export function zoomOutStart(
	lines: readonly string[],
	tabSize: number,
	startLine: number,
): number | null {
	const headings = parseHeadings(lines);
	const heading = headings.find((candidate) => candidate.line === startLine);
	if (heading) return enclosingHeadings(headings, heading.line).pop()?.line ?? null;
	const item = itemStartingAt(parseOutline(lines, tabSize), startLine);
	if (!item) return null;
	const parent = zoomOutTarget(item);
	if (parent) return parent.startLine;
	return enclosingHeadings(headings, item.startLine).pop()?.line ?? null;
}
