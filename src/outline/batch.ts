import type { IndentStyle } from './indent-style';
import {
	applyEdits,
	mapLineThrough,
	refuse,
	type EditResult,
	type LineMove,
	type Refusal,
} from './line-edit';

export type Operation = (
	lines: readonly string[],
	style: IndentStyle,
	lineIndex: number,
) => EditResult;

export type BatchResult = { ok: true; lines: string[]; steps: LineMove[][] } | Refusal;

/** Runs an operation on each item in turn and refuses everything when any one is refused. */
export function runOnItems(
	lines: readonly string[],
	style: IndentStyle,
	itemLines: readonly number[],
	operation: Operation,
): BatchResult {
	if (itemLines.length === 0) return refuse('not-a-list-item');
	let current = [...lines];
	const steps: LineMove[][] = [];
	for (const itemLine of itemLines) {
		const result = operation(current, style, mapLineThrough(itemLine, steps));
		if (!result.ok) return refuse(result.reason);
		current = applyEdits(current, result.edits);
		steps.push(result.lineMoves);
	}
	return { ok: true, lines: current, steps };
}
