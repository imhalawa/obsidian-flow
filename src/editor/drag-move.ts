import { foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language';
import {
	EditorSelection,
	type ChangeSpec,
	type EditorState,
	type StateEffect,
} from '@codemirror/state';
import { minimalChange } from '../outline/line-change';
import { lineAt, refuse, type Refusal } from '../outline/line-edit';
import { itemStartingAt } from '../outline/item-lookup';
import { parseListItem } from '../outline/list-item';
import { parseOutline } from '../outline/outline-tree';
import {
	moveSubtree,
	placeSubtree,
	takeSubtree,
	type DropDestination,
} from '../outline/move-subtree';
import { stateIndentStyle } from './editor-indent-style';
import type { ZoomTarget } from './zoom-control';
import { zoomField } from './zoom-field';

export type MoveOutcome = { ok: true } | Refusal;

const USER_EVENT = 'flow.drag-move';

interface FoldRange {
	from: number;
	to: number;
}

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

/** Tells whether a range of lines lies inside the zoomed range, or the note is not zoomed. */
function insideZoom(state: EditorState, fromLine: number, toLine: number): boolean {
	const zoom = state.field(zoomField, false);
	if (!zoom) return true;
	return (
		state.doc.line(fromLine + 1).from >= zoom.from && state.doc.line(toLine + 1).to <= zoom.to
	);
}

/** Returns the first lines of the items that are folded. */
function foldedLines(state: EditorState): number[] {
	const lines: number[] = [];
	foldedRanges(state).between(0, state.doc.length, (from) => {
		lines.push(state.doc.lineAt(from).number - 1);
	});
	return lines;
}

/** Returns the effects that unfold every fold. */
function unfoldEffects(state: EditorState): StateEffect<FoldRange>[] {
	const effects: StateEffect<FoldRange>[] = [];
	foldedRanges(state).between(0, state.doc.length, (from, to) => {
		effects.push(unfoldEffect.of({ from, to }));
	});
	return effects;
}

/** Returns the effects that fold the items again at the places their lines moved to. */
function refoldEffects(
	state: EditorState,
	lines: readonly string[],
	foldedBefore: readonly number[],
	moveLine: (line: number) => number,
): StateEffect<FoldRange>[] {
	const tree = parseOutline(lines, state.tabSize);
	const end = (line: number) => lineStart(lines, line) + lineAt(lines, line).length;
	return foldedBefore.flatMap((line) => {
		const item = itemStartingAt(tree, moveLine(line));
		if (!item || item.children.length === 0) return [];
		return [foldEffect.of({ from: end(item.startLine), to: end(item.endLine) })];
	});
}

/** Returns where a line of the note ends up when a block of lines moves from one place to another. */
function lineAfterMove(
	line: number,
	sourceLine: number,
	blockLength: number,
	blockStart: number,
): number {
	if (line >= sourceLine && line < sourceLine + blockLength)
		return blockStart + line - sourceLine;
	const withoutBlock = line < sourceLine ? line : line - blockLength;
	return withoutBlock < blockStart ? withoutBlock : withoutBlock + blockLength;
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
	const first = changed[0];
	const last = changed[changed.length - 1];
	if (first === undefined || last === undefined) return { ok: true };
	if (!insideZoom(state, first, last)) return refuse('outside-zoom');
	const changes = changed.map((line): ChangeSpec => {
		const change = minimalChange(lineAt(lines, line), lineAt(result.lines, line));
		const start = state.doc.line(line + 1).from;
		return { from: start + change.from, to: start + change.to, insert: change.insert };
	});
	const folded = foldedLines(state);
	if (folded.length > 0) target.dispatch({ effects: unfoldEffects(state) });
	target.dispatch({
		changes,
		selection: EditorSelection.cursor(textStart(result.lines, result.blockStart)),
		effects: refoldEffects(state, result.lines, folded, (line) =>
			lineAfterMove(line, sourceLine, result.blockLength, result.blockStart),
		),
		userEvent: USER_EVENT,
		scrollIntoView: true,
	});
	return { ok: true };
}

/** Returns the change that removes lines from a note without leaving a gap, kept inside the zoom. */
function removal(state: EditorState, fromLine: number, toLine: number): ChangeSpec {
	const doc = state.doc;
	const zoom = state.field(zoomField, false);
	const nextInside = toLine + 1 < doc.lines && (!zoom || doc.line(toLine + 2).from <= zoom.to);
	if (nextInside) return { from: doc.line(fromLine + 1).from, to: doc.line(toLine + 2).from };
	const previousInside = fromLine > 0 && (!zoom || doc.line(fromLine).to >= zoom.from);
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
	const zoom = destination.state.field(zoomField, false);
	const nextInside =
		placed.blockStart < doc.lines && (!zoom || doc.line(placed.blockStart + 1).from <= zoom.to);
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
