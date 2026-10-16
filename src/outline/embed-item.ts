import { parseListItem } from './list-item';

const EMBED = /^(?:!\[\[[^\]]+\]\]|!\[[^\]]*\]\([^)]+\))(?:\s+\^[A-Za-z0-9-]+)?\s*$/;

/** Tells whether a line is a list item that holds one embed and nothing else. */
export function isEmbedItem(line: string): boolean {
	const item = parseListItem(line);
	return item !== null && item.checked === null && EMBED.test(item.content);
}
