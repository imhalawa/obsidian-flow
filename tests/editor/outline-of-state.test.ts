import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { outlineOfState } from '../../src/editor/outline-of-state';

describe('outlineOfState', () => {
	it('parses the items of the note', () => {
		const state = EditorState.create({ doc: '- a\n  - b' });
		expect(outlineOfState(state).nodes.map((node) => node.text)).toEqual(['a', 'b']);
	});

	it('parses with the tab size of the editor', () => {
		const state = EditorState.create({
			doc: '- a\n\t- b',
			extensions: [EditorState.tabSize.of(2)],
		});
		expect(outlineOfState(state).nodes.map((node) => node.indentColumns)).toEqual([0, 2]);
	});

	it('returns the same outline for the same version of the text', () => {
		const state = EditorState.create({ doc: '- a' });
		expect(outlineOfState(state)).toBe(outlineOfState(state));
	});

	it('parses again after the text changes', () => {
		const state = EditorState.create({ doc: '- a' });
		const next = state.update({ changes: { from: 3, insert: '\n- b' } }).state;
		expect(outlineOfState(next).nodes).toHaveLength(2);
	});
});
