import { foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language';
import { EditorSelection, type EditorState, type StateEffect } from '@codemirror/state';
import { allFoldSpans, foldLookup, isFoldable, type FoldSpan } from '../outline/fold';
import { itemStartingAt } from '../outline/item-lookup';
import { parseOutline } from '../outline/outline-tree';
import type { ZoomRange } from '../outline/zoom';
import type { ZoomTarget } from './zoom-control';
import { zoomField } from './zoom-field';

export type FoldOutcome = 'done' | 'not-a-list-item' | 'no-children';

interface DocRange {
	from: number;
	to: number;
}

/** Returns the document range a fold of an item hides: after its first line to the subtree end. */
function rangeOf(state: EditorState, span: FoldSpan): DocRange {
	return {
		from: state.doc.line(span.fromLine + 1).to,
		to: state.doc.line(span.toLine + 1).to,
	};
}

/** Returns the folds that start where a fold range starts. */
function foldsStartingAt(state: EditorState, position: number): DocRange[] {
	const found: DocRange[] = [];
	foldedRanges(state).between(position, position, (from, to) => {
		if (from === position) found.push({ from, to });
	});
	return found;
}

/** Returns the lines the user can see: the zoomed range, or the whole note. */
function visibleLines(state: EditorState): ZoomRange {
	const zoom = state.field(zoomField);
	if (!zoom) return { fromLine: 0, toLine: state.doc.lines - 1 };
	return {
		fromLine: state.doc.lineAt(zoom.from).number - 1,
		toLine: state.doc.lineAt(zoom.to).number - 1,
	};
}

/** Moves the main cursor to the start of a fold when the fold would hide it. */
function selectionOutside(
	state: EditorState,
	folds: readonly DocRange[],
): EditorSelection | undefined {
	const head = state.selection.main.head;
	const hiding = folds.find((fold) => head > fold.from && head <= fold.to);
	return hiding ? EditorSelection.single(hiding.from) : undefined;
}

/** Folds the ranges that are not folded yet and keeps the cursor visible. */
function foldRanges(target: ZoomTarget, ranges: readonly DocRange[]): void {
	const fresh = ranges.filter((range) => foldsStartingAt(target.state, range.from).length === 0);
	if (fresh.length === 0) return;
	target.dispatch({
		effects: fresh.map((range) => foldEffect.of(range)),
		selection: selectionOutside(target.state, fresh),
	});
}

/** Folds the deepest item at the cursor. */
export function foldItem(target: ZoomTarget): FoldOutcome {
	const state = target.state;
	const cursorLine = state.doc.lineAt(state.selection.main.head).number - 1;
	const lookup = foldLookup(state.doc.toJSON(), state.tabSize, cursorLine);
	if (lookup.kind !== 'span') return lookup.kind;
	foldRanges(target, [rangeOf(state, lookup.span)]);
	return 'done';
}

/** Unfolds the deepest item at the cursor. */
export function unfoldItem(target: ZoomTarget): FoldOutcome {
	const state = target.state;
	const cursorLine = state.doc.lineAt(state.selection.main.head).number - 1;
	const lookup = foldLookup(state.doc.toJSON(), state.tabSize, cursorLine);
	if (lookup.kind !== 'span') return lookup.kind;
	const effects = foldsStartingAt(state, rangeOf(state, lookup.span).from).map((fold) =>
		unfoldEffect.of(fold),
	);
	if (effects.length > 0) target.dispatch({ effects });
	return 'done';
}

/** Folds every item with children that is visible. */
export function foldAll(target: ZoomTarget): FoldOutcome {
	const state = target.state;
	const spans = allFoldSpans(state.doc.toJSON(), state.tabSize, visibleLines(state));
	foldRanges(
		target,
		spans.map((span) => rangeOf(state, span)),
	);
	return 'done';
}

/** Unfolds every fold in the note. */
export function unfoldAll(target: ZoomTarget): FoldOutcome {
	const effects: StateEffect<DocRange>[] = [];
	foldedRanges(target.state).between(0, target.state.doc.length, (from, to) => {
		effects.push(unfoldEffect.of({ from, to }));
	});
	if (effects.length > 0) target.dispatch({ effects });
	return 'done';
}

/** Folds an item that starts on a line, or unfolds it when it is folded; deep acts on its descendants too. */
export function toggleBranch(target: ZoomTarget, startLine: number, deep: boolean): FoldOutcome {
	const state = target.state;
	const tree = parseOutline(state.doc.toJSON(), state.tabSize);
	const item = itemStartingAt(tree, startLine);
	if (!item) return 'not-a-list-item';
	if (!isFoldable(item)) return 'no-children';
	const span = { fromLine: item.startLine, toLine: item.endLine };
	const folded = isFolded(state, startLine);
	const spans = deep ? allFoldSpans(state.doc.toJSON(), state.tabSize, span) : [span];
	if (!folded) {
		foldRanges(
			target,
			spans.map((each) => rangeOf(state, each)),
		);
		return 'done';
	}
	const effects = spans.flatMap((each) =>
		foldsStartingAt(state, rangeOf(state, each).from).map((fold) => unfoldEffect.of(fold)),
	);
	if (effects.length > 0) target.dispatch({ effects });
	return 'done';
}

/** Tells whether the item that starts on a line has its children folded. */
export function isFolded(state: EditorState, startLine: number): boolean {
	const item = itemStartingAt(parseOutline(state.doc.toJSON(), state.tabSize), startLine);
	if (!item || !isFoldable(item)) return false;
	const span = { fromLine: item.startLine, toLine: item.endLine };
	return foldsStartingAt(state, rangeOf(state, span).from).length > 0;
}

/** Tells whether a fold hides the line that starts at a position. */
export function isHiddenByFold(state: EditorState, lineStart: number): boolean {
	let hidden = false;
	foldedRanges(state).between(lineStart, lineStart, (from, to) => {
		if (from < lineStart && lineStart <= to) hidden = true;
	});
	return hidden;
}
