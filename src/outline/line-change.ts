export interface LineChange {
	from: number;
	to: number;
	insert: string;
}

/** Returns the smallest single replacement that turns one line into another. */
export function minimalChange(before: string, after: string): LineChange {
	const shortest = Math.min(before.length, after.length);
	let prefix = 0;
	while (prefix < shortest && before.charAt(prefix) === after.charAt(prefix)) prefix += 1;
	let suffix = 0;
	while (
		suffix < shortest - prefix &&
		before.charAt(before.length - 1 - suffix) === after.charAt(after.length - 1 - suffix)
	) {
		suffix += 1;
	}
	return {
		from: prefix,
		to: before.length - suffix,
		insert: after.slice(prefix, after.length - suffix),
	};
}

/** Maps a column through a change; columns inside the replaced text land after the new text. */
export function mapColumn(change: LineChange, column: number): number {
	if (column < change.from) return column;
	if (column >= change.to) return column + change.insert.length - (change.to - change.from);
	return change.from + change.insert.length;
}
