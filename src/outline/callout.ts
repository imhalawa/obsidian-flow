import { visualWidth } from './list-item';
import type { OutlineNode, OutlineTree } from './outline-tree';

export interface CalloutBlock {
	startLine: number;
	endLine: number;
	markerColumn: number;
	hasChildren: boolean;
	markdown: string;
}

const BULLET_MARKER = /^[-*+]$/;
const CALLOUT_HEAD = /^>\s*\[![^\]\s]+\]/;
const QUOTE_LINE = /^\s*>/;
const QUOTE_START = /^\s*(?:[-*+]\s+)?>/;

/** Tells whether a line is a quote or a bullet that holds a quote. */
export function startsWithQuote(line: string): boolean {
	return QUOTE_START.test(line);
}

/** Tells whether an item is a plain bullet whose text opens a callout. */
function opensCallout(item: OutlineNode): boolean {
	return BULLET_MARKER.test(item.marker) && item.checked === null && CALLOUT_HEAD.test(item.text);
}

/** Returns the last line of the quote lines that continue a callout bullet at its text column. */
function lastBodyLine(lines: readonly string[], item: OutlineNode, tabSize: number): number {
	let last = item.startLine;
	for (let line = item.startLine + 1; line <= item.endLine; line += 1) {
		const text = lines[line] ?? '';
		const indent = text.slice(0, text.length - text.trimStart().length);
		if (!QUOTE_LINE.test(text) || visualWidth(indent, tabSize) < item.contentColumn) break;
		last = line;
	}
	return last;
}

/** Returns the callout bullets of a note: each bullet whose text opens a callout, with the quote lines that continue it. */
export function findCallouts(
	lines: readonly string[],
	tree: OutlineTree,
	tabSize: number,
): CalloutBlock[] {
	return tree.nodes.filter(opensCallout).map((item) => {
		const endLine = lastBodyLine(lines, item, tabSize);
		const body = lines.slice(item.startLine + 1, endLine + 1).map((text) => text.trimStart());
		const head = lines[item.startLine] ?? '';
		return {
			startLine: item.startLine,
			endLine,
			markerColumn: head.length - item.text.length,
			hasChildren: item.children.length > 0,
			markdown: [item.text, ...body].join('\n'),
		};
	});
}
