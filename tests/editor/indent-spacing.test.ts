import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { INDENT_SPACING_CLASS, indentSpacing } from '../../src/editor/indent-spacing';

const classesOf = (enabled: boolean): string[] => {
	const state = EditorState.create({ extensions: [indentSpacing(() => enabled)] });
	return state
		.facet(EditorView.editorAttributes)
		.map((source) => (typeof source === 'function' ? source(null as never) : source))
		.flatMap((attributes) => (attributes?.class ? [attributes.class] : []));
};

describe('indentSpacing', () => {
	it('adds the spacing class while the setting is on', () => {
		expect(classesOf(true)).toEqual([INDENT_SPACING_CLASS]);
	});

	it('adds nothing while the setting is off', () => {
		expect(classesOf(false)).toEqual([]);
	});
});
