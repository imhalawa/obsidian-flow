import { parseListItem, visualWidth, type ListItem } from './list-item';

export interface OutlineNode {
	startLine: number;
	endLine: number;
	indent: string;
	indentColumns: number;
	marker: string;
	contentColumn: number;
	checked: boolean | null;
	text: string;
	parent: OutlineNode | null;
	children: OutlineNode[];
}

export interface OutlineTree {
	roots: OutlineNode[];
	nodes: OutlineNode[];
}

interface ActiveFence {
	char: string;
	length: number;
	owner: OutlineNode | null;
}

interface ParseState {
	tree: OutlineTree;
	last: OutlineNode | null;
	afterBlank: boolean;
	fence: ActiveFence | null;
	tabSize: number;
}

const INDENTED_CODE_COLUMNS = 4;
const FENCE_OPEN = /^\s*(`{3,}|~{3,})/;
const LIST_INTERRUPT = /^\s*(?:#{1,6}(?:\s|$)|>|`{3,}|~{3,}|([-*_])(?:\s*\1){2,}\s*$)/;
const THEMATIC_BREAK = /^\s*([-*_])(\s*\1){2,}\s*$/;

/** Returns the index of the first line after a closed front matter block, or 0 when there is none. */
function firstBodyLine(lines: readonly string[]): number {
	if (lines[0] !== '---') return 0;
	return lines.indexOf('---', 1) + 1;
}

/** Marks a node and all its ancestors as reaching at least the given line. */
function extendThrough(node: OutlineNode | null, lineIndex: number): void {
	for (let up = node; up; up = up.parent) up.endLine = lineIndex;
}

/** Returns the nearest node, starting at `from`, whose content column is at or below `columns`. */
function nearestContaining(from: OutlineNode | null, columns: number): OutlineNode | null {
	let node = from;
	while (node && columns < node.contentColumn) node = node.parent;
	return node;
}

/** Opens a fenced code block when the line starts one. */
function openFence(state: ParseState, line: string, owner: OutlineNode | null): void {
	const run = FENCE_OPEN.exec(line)?.[1];
	if (run === undefined) return;
	state.fence = { char: run.charAt(0), length: run.length, owner };
}

/** Consumes one line inside a fenced code block. */
function consumeFenceLine(
	state: ParseState,
	fence: ActiveFence,
	line: string,
	lineIndex: number,
): void {
	extendThrough(fence.owner, lineIndex);
	const trimmed = line.trim();
	const closes = trimmed.length >= fence.length && [...trimmed].every((c) => c === fence.char);
	if (closes) state.fence = null;
}

/** Reads a line as a list item, or null when it is a thematic break, indented code or plain text. */
function readItem(state: ParseState, line: string, columns: number): ListItem | null {
	if (THEMATIC_BREAK.test(line)) return null;
	if (state.last === null && columns >= INDENTED_CODE_COLUMNS) return null;
	return parseListItem(line);
}

/** Adds a list item line to the tree under the nearest containing item. */
function addItem(state: ParseState, item: ListItem, lineIndex: number, columns: number): void {
	extendThrough(state.last, lineIndex - 1);
	const gapColumns = visualWidth(item.indent + item.marker + item.gap, state.tabSize);
	const markerEnd = visualWidth(item.indent + item.marker, state.tabSize);
	const wideGap = gapColumns - markerEnd > INDENTED_CODE_COLUMNS;
	const parent = nearestContaining(state.last, columns);
	const node: OutlineNode = {
		startLine: lineIndex,
		endLine: lineIndex,
		indent: item.indent,
		indentColumns: columns,
		marker: item.marker,
		contentColumn: wideGap ? markerEnd + 1 : gapColumns,
		checked: item.checked,
		text: item.content,
		parent,
		children: [],
	};
	(parent ? parent.children : state.tree.roots).push(node);
	state.tree.nodes.push(node);
	extendThrough(node, lineIndex);
	state.last = node;
}

/** Handles a non-blank line that is not a list item. */
function addText(state: ParseState, line: string, lineIndex: number, columns: number): void {
	const lazy = !state.afterBlank && !LIST_INTERRUPT.test(line);
	const owner = lazy ? state.last : nearestContaining(state.last, columns);
	if (!owner) state.last = null;
	extendThrough(owner, lineIndex);
	openFence(state, line, owner);
}

/** Parses markdown lines into a tree of list items. */
export function parseOutline(lines: readonly string[], tabSize: number): OutlineTree {
	const state: ParseState = {
		tree: { roots: [], nodes: [] },
		last: null,
		afterBlank: false,
		fence: null,
		tabSize,
	};
	const firstLine = firstBodyLine(lines);
	lines.forEach((line, index) => {
		if (index < firstLine) return;
		if (state.fence) {
			consumeFenceLine(state, state.fence, line, index);
		} else if (line.trim() === '') {
			state.afterBlank = true;
			return;
		} else {
			const columns = visualWidth(
				line.slice(0, line.length - line.trimStart().length),
				tabSize,
			);
			const item = readItem(state, line, columns);
			if (item) addItem(state, item, index, columns);
			else addText(state, line, index, columns);
		}
		state.afterBlank = false;
	});
	return state.tree;
}
