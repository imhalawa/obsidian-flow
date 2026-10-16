const WIKILINK = /\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const PAIRED_MARKERS = /(\*\*|__|~~|==)(\S|\S.*?\S)\1/g;
const STARS = /\*(\S|\S.*?\S)\*/g;
const UNDERSCORES = /(^|\W)_(\S|\S.*?\S)_(?!\w)/g;
const CODE = /`([^`]+)`/g;

/** Returns the text of an item as a reader sees it, without emphasis, highlight, strikethrough, code or link markers. */
export function stripInlineMarkdown(text: string): string {
	return text
		.replace(WIKILINK, '$1')
		.replace(LINK, '$1')
		.replace(PAIRED_MARKERS, '$2')
		.replace(STARS, '$1')
		.replace(UNDERSCORES, '$1$2')
		.replace(CODE, '$1');
}
