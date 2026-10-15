import type { Editor, EditorChange, EditorPosition, EditorRangeOrCaret } from 'obsidian';
import { runOnItems, type Operation } from '../outline/batch';
import { minimalChange } from '../outline/line-change';
import { lineAt, refuse, type Refusal } from '../outline/line-edit';
import { mapPosition } from '../outline/position-map';
import { selectedItemLines, type LineRange } from '../outline/selection';
import { readIndentStyle } from './editor-indent-style';

export type TreeEditor = Pick<Editor, 'getValue' | 'listSelections' | 'transaction'>;

export type TreeEditOutcome = { ok: true } | Refusal;

interface EditorSelection {
	anchor: EditorPosition;
	head: EditorPosition;
}

/** Returns the lines a selection covers; a range ending at a line start leaves that line out. */
function coveredLines(selection: EditorSelection): LineRange {
	const fromLine = Math.min(selection.anchor.line, selection.head.line);
	const toLine = Math.max(selection.anchor.line, selection.head.line);
	const later = selection.anchor.line > selection.head.line ? selection.anchor : selection.head;
	const endsAtLineStart = toLine > fromLine && later.ch === 0;
	return { fromLine, toLine: endsAtLineStart ? toLine - 1 : toLine };
}

/** Tells whether the selection touches at least one list item. */
export function hasTreeTarget(editor: TreeEditor): boolean {
	const lines = editor.getValue().split('\n');
	const style = readIndentStyle(editor, lines);
	return (
		selectedItemLines(lines, style.tabSize, editor.listSelections().map(coveredLines)).length >
		0
	);
}

/** Runs an item operation on every selected item as one editor transaction. */
export function runTreeEdit(
	editor: TreeEditor,
	operation: Operation,
	bottomUp: boolean,
): TreeEditOutcome {
	const lines = editor.getValue().split('\n');
	const style = readIndentStyle(editor, lines);
	const selections = editor.listSelections();
	const itemLines = selectedItemLines(lines, style.tabSize, selections.map(coveredLines));
	const result = runOnItems(lines, style, bottomUp ? itemLines.reverse() : itemLines, operation);
	if (!result.ok) return refuse(result.reason);
	const changes = result.lines.flatMap((text, line): EditorChange[] => {
		const change = minimalChange(lineAt(lines, line), text);
		if (change.insert === '' && change.from === change.to) return [];
		return [
			{ from: { line, ch: change.from }, to: { line, ch: change.to }, text: change.insert },
		];
	});
	const mapped: EditorRangeOrCaret[] = selections.map((selection) => ({
		from: mapPosition(lines, result.lines, result.steps, selection.anchor),
		to: mapPosition(lines, result.lines, result.steps, selection.head),
	}));
	editor.transaction({ changes, selections: mapped });
	return { ok: true };
}
