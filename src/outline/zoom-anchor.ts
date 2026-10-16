import { enclosingHeadings, parseHeadings, type Heading } from './headings';
import { itemStartingAt } from './item-lookup';
import { parseOutline, type OutlineNode, type OutlineTree } from './outline-tree';

export interface AnchorSegment {
	text: string;
	nth: number;
	heading?: true;
}

export type Anchor = readonly AnchorSegment[];

const TRAILING_BLOCK_ID = /\s\^[A-Za-z0-9-]+$/;

/** Returns the text of an item without its block id, the way anchors compare it. */
function anchorText(node: OutlineNode): string {
	return node.text.replace(TRAILING_BLOCK_ID, '').trim();
}

/** Returns the items that share a parent with a node, the node included. */
function siblingsOf(tree: OutlineTree, node: OutlineNode): readonly OutlineNode[] {
	return node.parent ? node.parent.children : tree.roots;
}

/** Returns the path from the top level item down to a node. */
function pathTo(node: OutlineNode): OutlineNode[] {
	const path: OutlineNode[] = [];
	for (let up: OutlineNode | null = node; up; up = up.parent) path.unshift(up);
	return path;
}

/** Returns the headings whose closest enclosing heading is the given one, or the top headings for null. */
function headingChildren(headings: readonly Heading[], parent: Heading | null): Heading[] {
	return headings.filter((heading) => {
		const above = enclosingHeadings(headings, heading.line).pop() ?? null;
		return above?.line === parent?.line;
	});
}

/** Describes a heading by its text and its position among equal headings with the same parent. */
function headingSegment(headings: readonly Heading[], heading: Heading): AnchorSegment {
	const parent = enclosingHeadings(headings, heading.line).pop() ?? null;
	const equal: Heading[] = headingChildren(headings, parent).filter(
		(other) => other.text === heading.text,
	);
	return { text: heading.text, nth: equal.indexOf(heading), heading: true };
}

/** Describes the headings above a line, outermost first. */
function headingSegments(headings: readonly Heading[], line: number): AnchorSegment[] {
	return enclosingHeadings(headings, line).map((heading) => headingSegment(headings, heading));
}

/** Describes a heading or item by the texts on its path and its position among equal siblings. */
export function makeAnchor(
	lines: readonly string[],
	tabSize: number,
	startLine: number,
): Anchor | null {
	const headings = parseHeadings(lines);
	const heading = headings.find((candidate) => candidate.line === startLine);
	if (heading) {
		return [...headingSegments(headings, heading.line), headingSegment(headings, heading)];
	}
	const tree = parseOutline(lines, tabSize);
	const item = itemStartingAt(tree, startLine);
	if (!item) return null;
	const items = pathTo(item).map((node): AnchorSegment => {
		const text = anchorText(node);
		const equal = siblingsOf(tree, node).filter((sibling) => anchorText(sibling) === text);
		return { text, nth: equal.indexOf(node) };
	});
	return [...headingSegments(headings, item.startLine), ...items];
}

/** Follows the heading segments of an anchor down and returns the deepest heading that still matches. */
function resolveHeadings(headings: readonly Heading[], anchor: Anchor): Heading | null {
	let found: Heading | null = null;
	for (const segment of anchor) {
		if (segment.heading !== true) break;
		const equal: Heading[] = headingChildren(headings, found).filter(
			(heading) => heading.text === segment.text,
		);
		const pick: Heading | undefined = equal[Math.min(segment.nth, equal.length - 1)];
		if (!pick) break;
		found = pick;
	}
	return found;
}

/** Tells whether the heading found is the one the last heading segment of an anchor names. */
function matchedEveryHeading(
	headings: readonly Heading[],
	found: Heading | null,
	anchor: Anchor,
): boolean {
	const wanted = anchor.filter((segment) => segment.heading === true).length;
	if (found === null) return wanted === 0;
	return enclosingHeadings(headings, found.line).length + 1 === wanted;
}

/** Returns the top level items inside the section of a heading, or all of them for no heading. */
function rootsUnder(tree: OutlineTree, heading: Heading | null): readonly OutlineNode[] {
	if (!heading) return tree.roots;
	return tree.roots.filter(
		(node) => heading.line < node.startLine && node.startLine <= heading.endLine,
	);
}

/** Returns the start line of the deepest heading or item an anchor still matches, or null when none matches. */
export function resolveAnchor(
	lines: readonly string[],
	tabSize: number,
	anchor: Anchor,
): number | null {
	const headings = parseHeadings(lines);
	const heading = resolveHeadings(headings, anchor);
	if (!matchedEveryHeading(headings, heading, anchor)) return heading ? heading.line : null;
	const tree = parseOutline(lines, tabSize);
	let siblings = rootsUnder(tree, heading);
	let found: OutlineNode | null = null;
	for (const segment of anchor.filter((each) => each.heading !== true)) {
		const equal = siblings.filter((sibling) => anchorText(sibling) === segment.text);
		const pick: OutlineNode | undefined = equal[Math.min(segment.nth, equal.length - 1)];
		if (!pick) break;
		found = pick;
		siblings = pick.children;
	}
	return found ? found.startLine : (heading?.line ?? null);
}
