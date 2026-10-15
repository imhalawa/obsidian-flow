import { readBlockId, stripBlockId } from './block-id';
import { parseOutline } from './outline-tree';

export interface IndexedItem {
	path: string;
	startLine: number;
	text: string;
	id: string | null;
}

export interface ItemTrigger {
	start: number;
	query: string;
}

const TRIGGER = /\(\(([^()\]]*)$/;
const PAIR_CLOSE = '))';

/** Lists the items of a note that have text, with their lines and block ids. */
export function itemsOfNote(path: string, text: string, tabSize: number): IndexedItem[] {
	const lines = text.split(/\r?\n/);
	return parseOutline(lines, tabSize)
		.nodes.map((node) => ({ node, text: stripBlockId(node.text) }))
		.filter((entry) => entry.text !== '')
		.map(({ node, text: label }) => ({
			path,
			startLine: node.startLine,
			text: label,
			id: readBlockId(lines, node),
		}));
}

/** Returns how well an item matches a lowercase query: 0 starts with it, 1 contains it, 2 is in a path, null no match. */
function rank(item: IndexedItem, query: string): number | null {
	const text = item.text.toLowerCase();
	if (text.startsWith(query)) return 0;
	if (text.includes(query)) return 1;
	if (item.path.toLowerCase().includes(query)) return 2;
	return null;
}

/** Returns up to a limit of the items that match a query, best matches first. */
export function searchItems(
	items: readonly IndexedItem[],
	query: string,
	limit: number,
): IndexedItem[] {
	const needle = query.trim().toLowerCase();
	if (needle === '') return items.slice(0, limit);
	return items
		.map((item, order) => ({ item, order, score: rank(item, needle) }))
		.filter((entry) => entry.score !== null)
		.sort((left, right) => (left.score ?? 0) - (right.score ?? 0) || left.order - right.order)
		.slice(0, limit)
		.map((entry) => entry.item);
}

/** Finds an open `((` and the query typed after it at the end of the text before the cursor. */
export function itemTrigger(linePrefix: string): ItemTrigger | null {
	const match = TRIGGER.exec(linePrefix);
	if (!match) return null;
	return { start: match.index, query: match[1] ?? '' };
}

/** Returns 2 when the text after the cursor starts with the `))` that auto pairing added, otherwise 0. */
export function closingParensAfter(rest: string): number {
	return rest.startsWith(PAIR_CLOSE) ? PAIR_CLOSE.length : 0;
}
