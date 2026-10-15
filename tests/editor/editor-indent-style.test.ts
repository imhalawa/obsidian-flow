import { indentUnit } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { readIndentStyle } from '../../src/editor/editor-indent-style';

const withSettings = (unit: string, tabSize: number) => ({
	cm: {
		state: EditorState.create({
			extensions: [indentUnit.of(unit), EditorState.tabSize.of(tabSize)],
		}),
	},
});

describe('readIndentStyle', () => {
	it('uses the editor settings when the note has no nested items', () => {
		expect(readIndentStyle(withSettings('  ', 4), ['- a', '- b'])).toEqual({
			useTabs: false,
			unitColumns: 2,
			tabSize: 4,
		});
	});

	it('uses tabs from the editor settings', () => {
		expect(readIndentStyle(withSettings('\t', 8), ['- a'])).toEqual({
			useTabs: true,
			unitColumns: 8,
			tabSize: 8,
		});
	});

	it('prefers the style already used in the note', () => {
		expect(readIndentStyle(withSettings('\t', 4), ['- a', '  - b'])).toEqual({
			useTabs: false,
			unitColumns: 2,
			tabSize: 4,
		});
	});

	it('reads the note with the tab size of the editor', () => {
		expect(readIndentStyle(withSettings('  ', 2), ['- a', '\t- b'])).toEqual({
			useTabs: true,
			unitColumns: 2,
			tabSize: 2,
		});
	});

	it.each([
		['no editor view', {}],
		['an editor view without state', { cm: {} }],
		['a state without facets', { cm: { state: { tabSize: 4 } } }],
		['a state without a tab size', { cm: { state: { facet: (): string => '  ' } } }],
		[
			'a state with a text tab size',
			{ cm: { state: { facet: (): string => '  ', tabSize: '4' } } },
		],
	])('falls back to tabs of width four with %s', (_name, editor) => {
		expect(readIndentStyle(editor, ['- a'])).toEqual({
			useTabs: true,
			unitColumns: 4,
			tabSize: 4,
		});
	});

	it('still detects the note style without an editor view', () => {
		expect(readIndentStyle({}, ['- a', '   - b'])).toEqual({
			useTabs: false,
			unitColumns: 3,
			tabSize: 4,
		});
	});
});
