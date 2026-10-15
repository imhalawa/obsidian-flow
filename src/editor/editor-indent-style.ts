import { indentUnit } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import { detectIndentStyle, styleFromUnit } from '../outline/indent-detect';
import type { IndentStyle } from '../outline/indent-style';

interface EditorWithState {
	cm?: { state?: Partial<EditorState> };
}

const FALLBACK_TAB_SIZE = 4;

/** Reads the editor's indent unit and tab size, or null when Obsidian does not expose them. */
function editorSettings(editor: object): { unit: string; tabSize: number } | null {
	const state = (editor as EditorWithState).cm?.state;
	if (!state || typeof state.facet !== 'function' || typeof state.tabSize !== 'number')
		return null;
	return { unit: state.facet(indentUnit), tabSize: state.tabSize };
}

/** Chooses the indent style: the note's own style first, then the editor settings, then tabs. */
export function readIndentStyle(editor: object, lines: readonly string[]): IndentStyle {
	const settings = editorSettings(editor);
	const tabSize = settings ? settings.tabSize : FALLBACK_TAB_SIZE;
	const detected = detectIndentStyle(lines, tabSize);
	if (detected) return detected;
	if (settings) return styleFromUnit(settings.unit, settings.tabSize);
	return { useTabs: true, unitColumns: FALLBACK_TAB_SIZE, tabSize: FALLBACK_TAB_SIZE };
}
