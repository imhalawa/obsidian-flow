import type { IndentStyle } from './indent-style';
import { visualWidth } from './list-item';
import { parseOutline } from './outline-tree';

/** Reads an indent style from the nested items of a note, or null when none are nested. */
export function detectIndentStyle(lines: readonly string[], tabSize: number): IndentStyle | null {
	const nested = parseOutline(lines, tabSize).nodes.flatMap((node) =>
		node.parent
			? [{ indent: node.indent, step: node.indentColumns - node.parent.indentColumns }]
			: [],
	);
	if (nested.length === 0) return null;
	if (nested.some((item) => item.indent.includes('\t'))) {
		return { useTabs: true, unitColumns: tabSize, tabSize };
	}
	return { useTabs: false, unitColumns: Math.min(...nested.map((item) => item.step)), tabSize };
}

/** Builds an indent style from an editor indent unit such as a tab or four spaces. */
export function styleFromUnit(unit: string, tabSize: number): IndentStyle {
	if (unit === '') return { useTabs: false, unitColumns: tabSize, tabSize };
	return { useTabs: unit.includes('\t'), unitColumns: visualWidth(unit, tabSize), tabSize };
}
