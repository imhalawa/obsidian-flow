import { parser } from '@lezer/markdown';

/** Lists each list item the Lezer markdown parser finds as `depth:text`. */
export function lezerShape(lines: readonly string[]): string[] {
	const doc = lines.join('\n');
	const shape: string[] = [];
	const cursor = parser.parse(doc).cursor();
	do {
		if (cursor.name !== 'ListItem') continue;
		const firstLine = doc.slice(cursor.from, cursor.to).split('\n')[0] ?? '';
		let depth = 0;
		for (let up = cursor.node.parent; up; up = up.parent) {
			if (up.name === 'ListItem') depth += 1;
		}
		shape.push(`${depth}:${firstLine.replace(/^\s*([-*+]|\d+[.)])\s+/, '')}`);
	} while (cursor.next());
	return shape;
}
