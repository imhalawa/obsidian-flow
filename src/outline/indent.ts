import { itemAtLine } from './item-lookup';
import { reindentLines, type IndentStyle } from './indent-style';
import { applyEdits, refuse, type EditResult, type LineEdit } from './line-edit';
import { parseOutline, type OutlineNode } from './outline-tree';
import { guardedEdits, nodeDepth } from './structure-guard';

const ORDERED_MARKER = /^(\s*)\d+([.)])/;

/** Returns the indent column for new children of a parent item. */
function childIndentColumns(parent: OutlineNode, style: IndentStyle): number {
	const first = parent.children[0];
	if (first) return first.indentColumns;
	return Math.max(parent.indentColumns + style.unitColumns, parent.contentColumn);
}

/** Rewrites the number of an ordered item to 1, keeping its delimiter and the other edits. */
function renumberToOne(lines: readonly string[], edits: LineEdit[], lineIndex: number): LineEdit[] {
	return applyEdits(lines, edits).flatMap((text, index) => {
		const final =
			index === lineIndex
				? text.replace(
						ORDERED_MARKER,
						(_match, indent: string, delimiter: string) => `${indent}1${delimiter}`,
					)
				: text;
		return final === lines[index] ? [] : [{ lineIndex: index, text: final }];
	});
}

/** Expected depths after moving a subtree and its descendants by `change` levels. */
function depthsAfterShift(
	lines: readonly string[],
	style: IndentStyle,
	item: OutlineNode,
	change: number,
): number[] {
	return parseOutline(lines, style.tabSize).nodes.map(
		(node) =>
			nodeDepth(node) +
			(node.startLine >= item.startLine && node.startLine <= item.endLine ? change : 0),
	);
}

/** Moves an item under its previous sibling, with its subtree. */
export function indentItem(
	lines: readonly string[],
	style: IndentStyle,
	lineIndex: number,
): EditResult {
	const tree = parseOutline(lines, style.tabSize);
	const item = itemAtLine(tree, lineIndex);
	if (!item) return refuse('not-a-list-item');
	const siblings = item.parent ? item.parent.children : tree.roots;
	const previous = siblings[siblings.indexOf(item) - 1];
	if (!previous) return refuse('no-previous-sibling');
	const delta = childIndentColumns(previous, style) - item.indentColumns;
	const shifted = reindentLines(lines, item.startLine, item.endLine, delta, style);
	const edits =
		previous.children.length === 0 ? renumberToOne(lines, shifted, item.startLine) : shifted;
	return guardedEdits(lines, style, edits, depthsAfterShift(lines, style, item, 1));
}

/** Moves an item to its parent's level; later siblings become its children. */
export function outdentItem(
	lines: readonly string[],
	style: IndentStyle,
	lineIndex: number,
): EditResult {
	const tree = parseOutline(lines, style.tabSize);
	const item = itemAtLine(tree, lineIndex);
	if (!item) return refuse('not-a-list-item');
	const parent = item.parent;
	if (!parent) return refuse('top-level');
	const later = parent.children.slice(parent.children.indexOf(item) + 1);
	const delta = parent.indentColumns - item.indentColumns;
	const firstChild = item.children[0];
	const childIndent = firstChild
		? firstChild.indentColumns + delta
		: Math.max(parent.indentColumns + style.unitColumns, item.contentColumn + delta);
	let edits = reindentLines(lines, item.startLine, item.endLine, delta, style);
	for (const sibling of later) {
		edits = edits.concat(
			reindentLines(
				lines,
				sibling.startLine,
				sibling.endLine,
				childIndent - sibling.indentColumns,
				style,
			),
		);
	}
	const firstLater = later[0];
	if (!firstChild && firstLater) edits = renumberToOne(lines, edits, firstLater.startLine);
	return guardedEdits(lines, style, edits, depthsAfterShift(lines, style, item, -1));
}
