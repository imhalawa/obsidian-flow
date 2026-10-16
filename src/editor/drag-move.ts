import { foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language';
import {
	EditorSelection,
	type ChangeSpec,
	type EditorState,
	type StateEffect,
} from '@codemirror/state';
import { itemStartingAt } from '../outline/item-lookup';
import { minimalChange } from '../outline/line-change';
import { lineAt, refuse, type Refusal } from '../outline/line-edit';
import { parseListItem } from '../outline/list-item';
import {
	lineAfterMove,
	moveSubtree,
	placeSubtree,
	takeSubtree,
	type DropDestination,
} from '../outline/move-subtree';
import { parseOutline } from '../outline/outline-tree';
import { stateIndentStyle } from './editor-indent-style';
import type { ZoomTarget } from './zoom-control';
import { zoomField } from './zoom-field';

export type MoveOutcome = { ok: true } | Refusal;

interface FoldRange {
	from: number;
	to: number;
}

interface LineRange {
	first: number;
	last: number;
}

const USER_EVENT = 'flow.drag-move';

/** Returns the document offset of the start of a line. */
function lineStart(lines: readonly string[], lineIndex: number): number {
	return lines.slice(0, lineIndex).reduce((sum, text) => sum + text.length + 1, 0);
}

/** Returns the offset where the text of an item line starts in a note. */
function textStart(lines: readonly string[], lineIndex: number): number {
	const text = lineAt(lines, lineIndex);
	const item = parseListItem(text);
	return lineStart(lines, lineIndex) + (item ? text.length - item.content.length : 0);
}

/** Returns the lines the zoom shows, or null when the note is not zoomed. */
function zoomedRange(state: EditorState): LineRange | null {
	const zoom = state.field(zoomField, false);
	if (!zoom) return null;
	return {
		first: state.doc.lineAt(zoom.from).number - 1,
		last: state.doc.lineAt(zoom.to).number - 1,
	};
}

/** Returns the folds that start on a line of a range, with that line. */
function foldsIn(state: EditorState, range: LineRange): (FoldRange & { line: number })[] {
	const folds: (FoldRange & { line: number })[] = [];
	foldedRanges(state).between(0, state.doc.length, (from, to) => {
		const line = state.doc.lineAt(from).number - 1;
		if (line >= range.first && line <= range.last) folds.push({ from, to, line });
	});
	return folds;
}

/** Returns the effects that fold the items again at the places their lines moved to. */
function refoldEffects(
	tabSize: number,
	lines: readonly string[],
	foldedBefore: readonly number[],
	moveLine: (line: number) => number,
): StateEffect<FoldRange>[] {
	const tree = parseOutline(lines, tabSize);
	const end = (line: number) => lineStart(lines, line) + lineAt(lines, line).length;
	return foldedBefore.flatMap((line) => {
		const item = itemStartingAt(tree, moveLine(line));
		if (!item || item.children.length === 0) return [];
		return [foldEffect.of({ from: end(item.startLine), to: end(item.endLine) })];
	});
}

/** Moves an item and its subtree to a destination in the same note as one transaction. */
export function dropWithin(
	target: ZoomTarget,
	sourceLine: number,
	destination: DropDestination,
): MoveOutcome {
	const state = target.state;
	const lines = state.doc.toJSON();
	const result = moveSubtree(lines, stateIndentStyle(state, lines), sourceLine, destination);
	if (!result.ok) return result;
	const changed = result.lines.flatMap((text, line) => (text === lines[line] ? [] : [line]));
	if (changed.length === 0) return { ok: true };
	const region = { first: Math.min(...changed), last: Math.max(...changed) };
	const zoom = zoomedRange(state);
	if (zoom && (region.first < zoom.first || region.last > zoom.last))
		return refuse('outside-zoom');
	const changes = changed.map((line): ChangeSpec => {
		const change = minimalChange(lineAt(lines, line), lineAt(result.lines, line));
		const start = state.doc.line(line + 1).from;
		return { from: start + change.from, to: start + change.to, insert: change.insert };
	});
	const folds = foldsIn(state, region);
	if (folds.length > 0) {
		target.dispatch({ effects: folds.map(({ from, to }) => unfoldEffect.of({ from, to })) });
	}
	target.dispatch({
		changes,
		selection: EditorSelection.cursor(textStart(result.lines, result.blockStart)),
		effects: refoldEffects(
			state.tabSize,
			result.lines,
			folds.map((fold) => fold.line),
			(line) => lineAfterMove(line, sourceLine, result.blockLength, result.blockStart),
		),
		userEvent: USER_EVENT,
		scrollIntoView: true,
	});
	return { ok: true };
}

/** Returns the change that removes lines from a note without leaving a gap, kept inside the zoom. */
function removal(state: EditorState, fromLine: number, toLine: number): ChangeSpec {
	const doc = state.doc;
	const zoom = zoomedRange(state);
	const nextInside = toLine + 1 < doc.lines && (!zoom || toLine + 1 <= zoom.last);
	if (nextInside) return { from: doc.line(fromLine + 1).from, to: doc.line(toLine + 2).from };
	const previousInside = fromLine > 0 && (!zoom || fromLine - 1 >= zoom.first);
	if (previousInside) return { from: doc.line(fromLine).to, to: doc.line(toLine + 1).to };
	return { from: doc.line(fromLine + 1).from, to: doc.line(toLine + 1).to };
}

/** Moves an item and its subtree into another note: writes the destination first, then removes the source. */
export function dropAcross(
	source: ZoomTarget,
	sourceLine: number,
	destination: ZoomTarget,
	place: DropDestination,
): MoveOutcome {
	const sourceLines = source.state.doc.toJSON();
	const taken = takeSubtree(sourceLines, stateIndentStyle(source.state, sourceLines), sourceLine);
	if (!taken.ok) return taken;
	const destinationLines = destination.state.doc.toJSON();
	const placed = placeSubtree(
		destinationLines,
		stateIndentStyle(destination.state, destinationLines),
		taken.block,
		place,
	);
	if (!placed.ok) return placed;
	const block = placed.lines.slice(placed.blockStart, placed.blockStart + taken.block.length);
	const doc = destination.state.doc;
	const zoom = zoomedRange(destination.state);
	const nextInside = placed.blockStart < doc.lines && (!zoom || placed.blockStart <= zoom.last);
	const text = block.join('\n');
	const change = nextInside
		? { from: doc.line(placed.blockStart + 1).from, insert: `${text}\n` }
		: { from: doc.line(placed.blockStart).to, insert: `\n${text}` };
	destination.dispatch({
		changes: change,
		selection: EditorSelection.cursor(textStart(placed.lines, placed.blockStart)),
		userEvent: USER_EVENT,
		scrollIntoView: true,
	});
	if (destination.state.doc.length === doc.length) return refuse('outside-zoom');
	source.dispatch({
		changes: removal(source.state, sourceLine, sourceLine + taken.block.length - 1),
		userEvent: USER_EVENT,
	});
	return { ok: true };
}
