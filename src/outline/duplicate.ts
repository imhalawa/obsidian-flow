import { stripBlockId } from './block-id';
import type { IndentStyle } from './indent-style';
import { itemStartingAt } from './item-lookup';
import { refuse } from './line-edit';
import { placeSubtree, subtreeLastLine, type PlaceResult } from './move-subtree';
import { parseOutline } from './outline-tree';

/** Copies an item and its subtree right below itself, leaving block ids on the original only. */
export function duplicateSubtree(
	lines: readonly string[],
	style: IndentStyle,
	sourceLine: number,
): PlaceResult {
	const item = itemStartingAt(parseOutline(lines, style.tabSize), sourceLine);
	if (!item) return refuse('not-a-list-item');
	const block = lines.slice(item.startLine, subtreeLastLine(lines, item) + 1).map(stripBlockId);
	return placeSubtree(lines, style, block, { kind: 'after', targetLine: sourceLine });
}
