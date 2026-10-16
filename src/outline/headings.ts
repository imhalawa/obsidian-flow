export interface Heading {
	line: number;
	level: number;
	text: string;
	endLine: number;
}

const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;

/** Returns the index of the first line after a closed front matter block, or 0 when there is none. */
function firstBodyLine(lines: readonly string[]): number {
	if (lines[0] !== '---') return 0;
	return lines.indexOf('---', 1) + 1;
}

/** Tells whether a line closes a fence opened with the given run of characters. */
function closesFence(line: string, run: string): boolean {
	const trimmed = line.trim();
	return trimmed.length >= run.length && [...trimmed].every((char) => char === run.charAt(0));
}

/** Returns the last line before a blank run that ends at or before the given line. */
function lastContentLine(lines: readonly string[], from: number, through: number): number {
	let line = through;
	while (line > from && lines[line]?.trim() === '') line -= 1;
	return line;
}

/** Finds the headings of a note outside code fences and front matter, without section ends. */
function findHeadings(lines: readonly string[]): Omit<Heading, 'endLine'>[] {
	const found: Omit<Heading, 'endLine'>[] = [];
	let fence: string | null = null;
	for (let line = firstBodyLine(lines); line < lines.length; line += 1) {
		const text = lines[line] ?? '';
		if (fence !== null) {
			if (closesFence(text, fence)) fence = null;
			continue;
		}
		const run = FENCE_OPEN.exec(text)?.[1];
		if (run !== undefined) {
			fence = run;
			continue;
		}
		const match = ATX_HEADING.exec(text);
		if (match) found.push({ line, level: (match[1] ?? '').length, text: match[2] ?? '' });
	}
	return found;
}

/** Returns the line of the first heading after an index that is at the same level or higher, or null. */
function nextSectionLine(
	found: readonly Omit<Heading, 'endLine'>[],
	index: number,
	level: number,
): number | null {
	for (let next = index + 1; next < found.length; next += 1) {
		const other = found[next];
		if (other && other.level <= level) return other.line;
	}
	return null;
}

/** Returns the headings of a note with the last line of each section, which ends before the next heading of the same or a higher level. */
export function parseHeadings(lines: readonly string[]): Heading[] {
	const found = findHeadings(lines);
	return found.map((heading, index) => {
		const next = nextSectionLine(found, index, heading.level);
		const through = next === null ? lines.length - 1 : next - 1;
		return { ...heading, endLine: lastContentLine(lines, heading.line, through) };
	});
}

/** Returns the headings whose section holds a line below the heading line itself, outermost first. */
export function enclosingHeadings(headings: readonly Heading[], line: number): Heading[] {
	return headings.filter((heading) => heading.line < line && line <= heading.endLine);
}
