const TRAILING_ID = /\s\^([A-Za-z0-9-]+)$/;

/** Returns the text without a trailing block id. */
export function stripBlockId(text: string): string {
	return text.replace(TRAILING_ID, '');
}
