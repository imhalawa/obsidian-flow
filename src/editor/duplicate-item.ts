import { EditorSelection } from '@codemirror/state';
import { duplicateSubtree } from '../outline/duplicate';
import type { Refusal } from '../outline/line-edit';
import { stateIndentStyle } from './editor-indent-style';
import type { ZoomTarget } from './zoom-control';

export type DuplicateOutcome = { ok: true } | Refusal;

const USER_EVENT = 'roamer.duplicate';

/** Copies the item that starts on a line, with its subtree, right below itself as one transaction. */
export function duplicateItem(target: ZoomTarget, startLine: number): DuplicateOutcome {
	const state = target.state;
	const lines = state.doc.toJSON();
	const result = duplicateSubtree(lines, stateIndentStyle(state, lines), startLine);
	if (!result.ok) return result;
	const copy = result.lines.slice(result.blockStart, result.blockStart + result.blockLength);
	const anchor = state.doc.line(result.blockStart).to;
	target.dispatch({
		changes: { from: anchor, insert: `\n${copy.join('\n')}` },
		selection: EditorSelection.cursor(anchor + 1 + (copy[0]?.length ?? 0)),
		userEvent: USER_EVENT,
		scrollIntoView: true,
	});
	return { ok: true };
}
