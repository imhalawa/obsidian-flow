export interface ListItem {
	indent: string;
	marker: string;
	gap: string;
	checked: boolean | null;
	content: string;
}

type ListItemMatch = [string, string, string, string, string | undefined, string];

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])(\s+)(?:\[([ xX])\]\s+)?(.*)$/;

/** Parses a markdown line into a list item, or null when it is not one. */
export function parseListItem(line: string): ListItem | null {
	const match = LIST_ITEM.exec(line);
	if (!match) return null;
	const [, indent, marker, gap, check, content] = match as unknown as ListItemMatch;
	return {
		indent,
		marker,
		gap,
		checked: check === undefined ? null : check !== ' ',
		content,
	};
}

/** Returns the width of text in columns, advancing each tab to the next tab stop. */
export function visualWidth(text: string, tabSize: number): number {
	let columns = 0;
	for (const ch of text) columns += ch === '\t' ? tabSize - (columns % tabSize) : 1;
	return columns;
}

/** Returns the nesting depth of an indent, counting a tab as `tabSize` columns. */
export function indentDepth(indent: string, tabSize: number): number {
	return Math.floor(visualWidth(indent, tabSize) / tabSize);
}
