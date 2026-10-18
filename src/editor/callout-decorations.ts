import { foldedRanges } from '@codemirror/language';
import { RangeSetBuilder, type EditorState, type Text } from '@codemirror/state';
import { Decoration, type DecorationSet, type WidgetType } from '@codemirror/view';
import { findCallouts, startsWithQuote, type CalloutBlock } from '../outline/callout';
import { outlineOfState } from './outline-of-state';

// TODO(obsidian-update): callout bullets are a plugin-only rendering, intentionally different from Obsidian's raw text. See docs/obsidian-internals.md.
export const CALLOUT_LINE_CLASS = 'roamer-callout-line';
export const CALLOUT_PARENT_CLASS = 'roamer-callout-parent';
export const CALLOUT_AFTER_CLASS = 'roamer-callout-after';

const calloutLine = Decoration.line({ class: CALLOUT_LINE_CLASS });
const calloutParentLine = Decoration.line({
	class: `${CALLOUT_LINE_CLASS} ${CALLOUT_PARENT_CLASS}`,
});
const afterCallout = Decoration.line({ class: CALLOUT_AFTER_CLASS });
const blocks = new WeakMap<Text, CalloutBlock[]>();

/** Returns the callout bullets of the note, found once for each version of the text. */
function calloutsOfState(state: EditorState): CalloutBlock[] {
	const cached = blocks.get(state.doc);
	if (cached) return cached;
	const found = findCallouts(state.doc.toJSON(), outlineOfState(state), state.tabSize);
	blocks.set(state.doc, found);
	return found;
}

/** Tells whether any selection range touches a line of the block, so the block shows its text. */
function isEdited(state: EditorState, block: CalloutBlock): boolean {
	return state.selection.ranges.some(
		(range) =>
			state.doc.lineAt(range.from).number - 1 <= block.endLine &&
			state.doc.lineAt(range.to).number - 1 >= block.startLine,
	);
}

/** Tells whether a fold starts at the end of the head line of a callout, so it hides the body and children. */
function isFolded(state: EditorState, headEnd: number): boolean {
	let folded = false;
	foldedRanges(state).between(headEnd, headEnd, (from) => {
		if (from === headEnd) folded = true;
	});
	return folded;
}

/** Returns the decorations that replace each callout bullet that is not being edited with a rendered callout. */
export function calloutDecorations(
	state: EditorState,
	makeWidget: (markdown: string) => WidgetType,
): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = state.doc;
	for (const block of calloutsOfState(state)) {
		if (isEdited(state, block)) continue;
		const head = doc.line(block.startLine + 1);
		const bodyEnd = doc.line(block.endLine + 1).to;
		const folded = isFolded(state, head.to);
		const drawsGuide = block.hasChildren && !folded;
		builder.add(head.from, head.from, drawsGuide ? calloutParentLine : calloutLine);
		builder.add(
			head.from + block.markerColumn,
			folded ? head.to : bodyEnd,
			Decoration.replace({
				widget: makeWidget(folded ? block.title : block.markdown),
			}),
		);
		if (block.endLine + 2 > doc.lines) continue;
		const next = doc.line(block.endLine + 2);
		if (!startsWithQuote(next.text)) builder.add(next.from, next.from, afterCallout);
	}
	return builder.finish();
}
