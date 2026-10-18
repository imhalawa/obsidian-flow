import { EditorSelection, type EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { backspaceAtItemStart } from '../outline/backspace-key';
import { enterOnEmptyItem, enterOnParentItem } from '../outline/enter-key';
import { homeColumn, itemTextRange, type LinePosition } from '../outline/home-select';
import { itemAtLine, itemStartingAt } from '../outline/item-lookup';
import type { KeyEdit } from '../outline/key-edit';
import { clampToItemText, isAtItemTextStart } from '../outline/text-clamp';
import { stateIndentStyle } from './editor-indent-style';
import { isFolded, toggleBranch } from './fold-control';
import { outlineOfState } from './outline-of-state';
import type { ZoomTarget } from './zoom-control';
import { zoomField } from './zoom-field';

interface CaretPosition {
	line: number;
	column: number;
}

/** Returns the line and column of the cursor, or null when the selection is not a single cursor. */
function caretOf(state: EditorState): CaretPosition | null {
	const selection = state.selection;
	const range = selection.main;
	if (selection.ranges.length !== 1 || !range.empty) return null;
	const line = state.doc.lineAt(range.head);
	return { line: line.number - 1, column: range.head - line.from };
}

/** Returns the document offset of a line and column. */
function offsetOf(state: EditorState, position: LinePosition): number {
	return state.doc.line(position.line + 1).from + position.column;
}

/** Applies a key edit as one transaction unless it would touch lines outside the zoom. */
function applyKeyEdit(target: ZoomTarget, edit: KeyEdit, userEvent: string): boolean {
	const doc = target.state.doc;
	const from = doc.line(edit.fromLine + 1).from;
	const to = doc.line(edit.toLine + 1).to;
	const zoom = target.state.field(zoomField);
	if (zoom && (from < zoom.from || to > zoom.to)) return false;
	target.dispatch({
		changes: { from, to, insert: edit.text },
		selection: EditorSelection.cursor(from + edit.caret),
		userEvent,
		scrollIntoView: true,
	});
	return true;
}

/** Handles Enter in an empty item by outdenting it, or ending the list at the top level. */
export function enterInEmptyItem(target: ZoomTarget): boolean {
	const state = target.state;
	const caret = caretOf(state);
	if (!caret) return false;
	const lines = state.doc.toJSON();
	const edit = enterOnEmptyItem(lines, stateIndentStyle(state, lines), caret.line, caret.column);
	return edit !== null && applyKeyEdit(target, edit, 'roamer.list-enter');
}

/** Handles Enter at the end of an item with children by adding a new first child, unfolding the item first. */
export function enterInParentItem(target: ZoomTarget): boolean {
	const state = target.state;
	const caret = caretOf(state);
	if (!caret) return false;
	const edit = enterOnParentItem(state.doc.toJSON(), state.tabSize, caret.line, caret.column);
	if (!edit) return false;
	const item = itemAtLine(outlineOfState(state), caret.line);
	if (item && isFolded(state, item.startLine)) toggleBranch(target, item.startLine, false);
	return applyKeyEdit(target, edit, 'roamer.list-enter');
}

/** Handles Backspace at the start of an item's text by merging it into the item above. */
export function backspaceInItem(target: ZoomTarget): boolean {
	const state = target.state;
	const caret = caretOf(state);
	if (!caret) return false;
	const edit = backspaceAtItemStart(state.doc.toJSON(), state.tabSize, caret.line, caret.column);
	return edit !== null && applyKeyEdit(target, edit, 'roamer.list-backspace');
}

/** Handles Home by moving the cursor to the start of the item text; `extend` keeps the selection anchor. */
export function homeInItem(
	target: ZoomTarget,
	extend: boolean,
	onFirstRow: (position: number) => boolean,
): boolean {
	const state = target.state;
	const selection = state.selection;
	const head = selection.main.head;
	if (selection.ranges.length !== 1 || !onFirstRow(head)) return false;
	const line = state.doc.lineAt(head);
	const column = homeColumn(state.doc.toJSON(), state.tabSize, line.number - 1, head - line.from);
	if (column === null) return false;
	const destination = line.from + column;
	target.dispatch({
		selection: extend
			? EditorSelection.range(selection.main.anchor, destination)
			: EditorSelection.cursor(destination),
		scrollIntoView: true,
		userEvent: 'select',
	});
	return true;
}

/** Handles select all by first selecting the text of the item at the cursor. */
export function selectItemText(target: ZoomTarget): boolean {
	const state = target.state;
	const selection = state.selection;
	if (selection.ranges.length !== 1) return false;
	const main = selection.main;
	const range = itemTextRange(
		state.doc.toJSON(),
		state.tabSize,
		state.doc.lineAt(main.head).number - 1,
	);
	if (!range) return false;
	const from = offsetOf(state, range.from);
	const to = offsetOf(state, range.to);
	if (main.from <= from && main.to >= to) return false;
	target.dispatch({
		selection: EditorSelection.range(from, to),
		scrollIntoView: true,
		userEvent: 'select',
	});
	return true;
}

/** Tells whether the cursor is exactly at the start of the text of a list item, and gives its line and whether the item has text. */
function atItemTextStart(
	state: EditorState,
): { lineStart: number; lineNumber: number; hasText: boolean } | null {
	const caret = caretOf(state);
	if (!caret) return null;
	const line = state.doc.line(caret.line + 1);
	const item = itemStartingAt(outlineOfState(state), caret.line);
	if (!isAtItemTextStart(line.text, item, caret.column)) return null;
	return {
		lineStart: line.from,
		lineNumber: line.number,
		hasText: line.text.length > caret.column,
	};
}

/** Handles Backspace at the start of the text of an item that has text and cannot merge by doing nothing, so the bullet is never eaten. */
export function keepBulletOnBackspace(target: ZoomTarget): boolean {
	return atItemTextStart(target.state)?.hasText === true;
}

/** Handles the left arrow at the start of an item's text by moving to the end of the line above, since the bullet is not part of the text; `extend` keeps the selection anchor. */
export function leftAtItemStart(view: EditorView, extend: boolean): boolean {
	const start = atItemTextStart(view.state);
	if (!start || start.lineNumber === 1) return false;
	const destination = view.moveByChar(EditorSelection.cursor(start.lineStart), false).head;
	const anchor = view.state.selection.main.anchor;
	view.dispatch({
		selection: extend
			? EditorSelection.range(anchor, destination)
			: EditorSelection.cursor(destination),
		scrollIntoView: true,
		userEvent: 'select',
	});
	return true;
}

/** Handles select all while zoomed by selecting the text of the zoomed item and everything under it, never the hidden lines. */
export function selectZoomedRange(target: ZoomTarget): boolean {
	const state = target.state;
	const zoom = state.field(zoomField, false);
	if (!zoom) return false;
	const line = state.doc.lineAt(zoom.from);
	const item = itemStartingAt(outlineOfState(state), line.number - 1);
	const from = line.from + clampToItemText(line.text, item, 0);
	const main = state.selection.main;
	if (state.selection.ranges.length === 1 && main.from === from && main.to === zoom.to) {
		return true;
	}
	target.dispatch({
		selection: EditorSelection.range(from, zoom.to),
		scrollIntoView: true,
		userEvent: 'select',
	});
	return true;
}
