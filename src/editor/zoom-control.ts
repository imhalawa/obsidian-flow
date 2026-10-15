import {
	EditorSelection,
	type EditorState,
	type SelectionRange,
	type TransactionSpec,
} from '@codemirror/state';
import { canGoBack, canGoForward, currentEntry, goBack, goForward } from '../outline/zoom-history';
import { resolveZoom, zoomInTarget, zoomOutStart } from '../outline/zoom-view';
import {
	zoomChange,
	zoomField,
	zoomOnLine,
	type ZoomNavigation,
	type ZoomState,
} from './zoom-field';
import { zoomHistoryField, type ZoomEntry } from './zoom-history-field';

export interface ZoomTarget {
	state: EditorState;
	dispatch(spec: TransactionSpec): void;
}

export type ZoomOutcome = 'done' | 'not-a-list-item' | 'item-removed';

export type HistoryDirection = 'back' | 'forward';

interface EditorWithView {
	cm?: Partial<ZoomTarget>;
}

/** Returns the editor view of an editor when the zoom extension is active in it, or null. */
export function zoomTargetOf(editor: object): ZoomTarget | null {
	const view = (editor as EditorWithView).cm;
	if (!view || typeof view.dispatch !== 'function' || !view.state) return null;
	if (view.state.field(zoomField, false) === undefined) return null;
	return view as ZoomTarget;
}

/** Tells whether the view is zoomed into an item. */
export function isZoomed(target: ZoomTarget): boolean {
	return target.state.field(zoomField) !== null;
}

/** Moves a position into the zoomed range. */
function clampPosition(position: number, zoom: ZoomState): number {
	return Math.min(Math.max(position, zoom.from), zoom.to);
}

/** Returns the selection with every range moved into the zoomed range. */
export function clampSelection(selection: EditorSelection, zoom: ZoomState): EditorSelection {
	const ranges = selection.ranges.map((range): SelectionRange =>
		EditorSelection.range(clampPosition(range.anchor, zoom), clampPosition(range.head, zoom)),
	);
	return EditorSelection.create(ranges, selection.mainIndex);
}

/** Zooms into the item on a line (or out to the whole note) and keeps the cursor inside. */
function dispatchZoom(
	target: ZoomTarget,
	startLine: number | null,
	navigation: ZoomNavigation,
): void {
	const next = startLine === null ? null : zoomOnLine(target.state, startLine);
	target.dispatch({
		effects: zoomChange.of({ startLine, navigation }),
		selection: next ? clampSelection(target.state.selection, next) : undefined,
		scrollIntoView: true,
	});
}

/** Returns the line a stored history entry points at, or null for the whole note. */
function entryLine(state: EditorState, entry: ZoomEntry): number | null {
	return entry === null ? null : state.doc.lineAt(Math.min(entry, state.doc.length)).number - 1;
}

/** Zooms into the deepest item at the cursor. */
export function zoomIn(target: ZoomTarget): ZoomOutcome {
	const state = target.state;
	const cursorLine = state.doc.lineAt(state.selection.main.head).number - 1;
	const startLine = zoomInTarget(state.doc.toJSON(), state.tabSize, cursorLine);
	if (startLine === null) return 'not-a-list-item';
	dispatchZoom(target, startLine, 'visit');
	return 'done';
}

/** Zooms out one level, to the parent item or to the whole note. */
export function zoomOut(target: ZoomTarget): ZoomOutcome {
	const zoom = target.state.field(zoomField);
	if (!zoom) return 'done';
	const startLine = target.state.doc.lineAt(zoom.from).number - 1;
	dispatchZoom(
		target,
		zoomOutStart(target.state.doc.toJSON(), target.state.tabSize, startLine),
		'visit',
	);
	return 'done';
}

/** Shows the whole note again. */
export function zoomReset(target: ZoomTarget): ZoomOutcome {
	dispatchZoom(target, null, 'visit');
	return 'done';
}

/** Tells whether the zoom history has an entry in the given direction. */
export function canStep(target: ZoomTarget, direction: HistoryDirection): boolean {
	const history = target.state.field(zoomHistoryField);
	return direction === 'back' ? canGoBack(history) : canGoForward(history);
}

/** Steps through the zoom history, falling back to the whole note when the item is gone. */
export function stepHistory(target: ZoomTarget, direction: HistoryDirection): ZoomOutcome {
	const history = target.state.field(zoomHistoryField);
	const moved = direction === 'back' ? goBack(history) : goForward(history);
	const startLine = entryLine(target.state, currentEntry(moved));
	const exists =
		startLine === null ||
		resolveZoom(target.state.doc.toJSON(), target.state.tabSize, startLine) !== null;
	if (exists) {
		dispatchZoom(target, startLine, direction);
		return 'done';
	}
	dispatchZoom(target, null, 'visit');
	return 'item-removed';
}
