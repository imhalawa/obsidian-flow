import { applyEdits, type EditResult } from '../../src/outline/line-edit';

/** Applies a successful edit result to the lines, or returns the refusal reason. */
export function resultingLines(lines: readonly string[], result: EditResult): string[] | string {
	return result.ok ? applyEdits(lines, result.edits) : result.reason;
}
