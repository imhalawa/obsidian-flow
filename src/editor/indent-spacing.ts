import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export const INDENT_SPACING_CLASS = 'roamer-indent';

/** Returns the extension that gives every editor the same indent width while the setting is on, so themes cannot change the gaps. */
export function indentSpacing(isEnabled: () => boolean): Extension {
	return EditorView.editorAttributes.of(() =>
		isEnabled() ? { class: INDENT_SPACING_CLASS } : null,
	);
}
