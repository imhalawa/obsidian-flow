import type { EditorState, Text } from '@codemirror/state';
import { parseOutline, type OutlineTree } from '../outline/outline-tree';

const trees = new WeakMap<Text, OutlineTree>();

/** Returns the outline of the note, parsed once for each version of the text. */
export function outlineOfState(state: EditorState): OutlineTree {
	const cached = trees.get(state.doc);
	if (cached) return cached;
	const tree = parseOutline(state.doc.toJSON(), state.tabSize);
	trees.set(state.doc, tree);
	return tree;
}
