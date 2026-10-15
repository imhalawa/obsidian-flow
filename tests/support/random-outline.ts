export interface IndentStyle {
	tabs: boolean;
	unit: number;
}

const TAB_SIZE = 4;

/** Returns a deterministic pseudo random generator for a seed. */
function seededRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
		mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
}

/** Writes an indent of the given column width in the given style. */
function indentFor(columns: number, style: IndentStyle): string {
	if (!style.tabs) return ' '.repeat(columns);
	return '\t'.repeat(Math.floor(columns / TAB_SIZE)) + ' '.repeat(columns % TAB_SIZE);
}

/** Builds a random valid outline document, one line per entry. */
export function randomOutline(
	seed: number,
	markers: readonly string[],
	style: IndentStyle,
): string[] {
	const random = seededRandom(seed);
	const lines: string[] = [];
	const total = 3 + Math.floor(random() * 10);
	let counter = 0;
	const parents: { indent: number; content: number }[] = [];
	for (let made = 0; made < total; made += 1) {
		const marker = markers[Math.floor(random() * markers.length)] ?? '-';
		const maxDepth = parents.length;
		const depth = made === 0 ? 0 : Math.floor(random() * (maxDepth + 1));
		parents.length = depth;
		const parent = parents[depth - 1];
		const unit = style.tabs ? TAB_SIZE : style.unit;
		const indent = parent ? Math.max(parent.indent + unit, parent.content) : 0;
		counter += 1;
		lines.push(`${indentFor(indent, style)}${marker} item${counter}`);
		const content = indent + marker.length + 1;
		if (random() < 0.25) {
			lines.push(`${indentFor(content, style)}more${counter}`);
		}
		parents.push({ indent, content });
	}
	return lines;
}
