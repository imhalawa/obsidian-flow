import { refuse, type EditResult, type LineEdit } from './line-edit';
import { shiftIndent, type IndentStyle } from './indent-style';
import { itemAtLine } from './item-lookup';
import { parseOutline, type OutlineNode } from './outline-tree';
import { guardedEdits, nodeDepth } from './structure-guard';

const DELIMITERS = ['.', ')'];

/** Returns the last character of a marker, which is the delimiter of an ordered marker. */
function delimiterOf(marker: string): string {
	return marker.slice(-1);
}

/** Tells whether two markers are ordered markers with the same delimiter. */
function sharesNumbering(first: string, second: string): boolean {
	return DELIMITERS.includes(delimiterOf(first)) && delimiterOf(first) === delimiterOf(second);
}

/** Writes a new marker on the first line of an item block and keeps its children inside it. */
function withMarker(
	block: string[],
	item: OutlineNode,
	marker: string,
	style: IndentStyle,
): string[] {
	const widened = Math.max(0, marker.length - item.marker.length);
	return block.map((line, offset) => {
		if (offset > 0) return shiftIndent(line, widened, style);
		const head = line.slice(0, item.indent.length);
		return head + marker + line.slice(item.indent.length + item.marker.length);
	});
}

/** Returns the lines of an item and its subtree. */
function blockOf(lines: readonly string[], item: OutlineNode): string[] {
	return lines.slice(item.startLine, item.endLine + 1);
}

/** Swaps two adjacent sibling subtrees, keeping ordered numbers in position. */
function swapSiblings(
	lines: readonly string[],
	style: IndentStyle,
	first: OutlineNode,
	second: OutlineNode,
): EditResult {
	const firstBlock = blockOf(lines, first);
	const secondBlock = blockOf(lines, second);
	const positional = sharesNumbering(first.marker, second.marker);
	const movedUp = positional ? withMarker(secondBlock, second, first.marker, style) : secondBlock;
	const movedDown = positional ? withMarker(firstBlock, first, second.marker, style) : firstBlock;
	const swapped = [...movedUp, ...movedDown];
	const edits: LineEdit[] = [];
	swapped.forEach((text, offset) => {
		const lineIndex = first.startLine + offset;
		if (text !== lines[lineIndex]) edits.push({ lineIndex, text });
	});
	const nodes = parseOutline(lines, style.tabSize).nodes;
	const within = (node: OutlineNode, from: OutlineNode) =>
		node.startLine >= from.startLine && node.startLine <= from.endLine;
	const expected = [
		...nodes.filter((node) => node.startLine < first.startLine),
		...nodes.filter((node) => within(node, second)),
		...nodes.filter((node) => within(node, first)),
		...nodes.filter((node) => node.startLine > second.endLine),
	].map(nodeDepth);
	const lineMoves = [
		{ fromLine: second.startLine, toLine: second.endLine, delta: -firstBlock.length },
		{ fromLine: first.startLine, toLine: first.endLine, delta: secondBlock.length },
	];
	return guardedEdits(lines, style, edits, expected, lineMoves);
}

/** Returns an item with its previous and next sibling. */
function siblingsOf(lines: readonly string[], style: IndentStyle, lineIndex: number) {
	const tree = parseOutline(lines, style.tabSize);
	const item = itemAtLine(tree, lineIndex);
	if (!item) return null;
	const siblings = item.parent ? item.parent.children : tree.roots;
	const position = siblings.indexOf(item);
	return { item, previous: siblings[position - 1], next: siblings[position + 1] };
}

/** Moves an item and its subtree above its previous sibling. */
export function moveItemUp(
	lines: readonly string[],
	style: IndentStyle,
	lineIndex: number,
): EditResult {
	const found = siblingsOf(lines, style, lineIndex);
	if (!found) return refuse('not-a-list-item');
	if (!found.previous) return refuse('no-previous-sibling');
	return swapSiblings(lines, style, found.previous, found.item);
}

/** Moves an item and its subtree below its next sibling. */
export function moveItemDown(
	lines: readonly string[],
	style: IndentStyle,
	lineIndex: number,
): EditResult {
	const found = siblingsOf(lines, style, lineIndex);
	if (!found) return refuse('not-a-list-item');
	if (!found.next) return refuse('no-next-sibling');
	return swapSiblings(lines, style, found.item, found.next);
}
