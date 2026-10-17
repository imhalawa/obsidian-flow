import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

export const setViewFocus = StateEffect.define<boolean>();

export const viewFocusField = StateField.define<boolean>({
	create: () => true,
	update(value, transaction) {
		for (const effect of transaction.effects) {
			if (effect.is(setViewFocus)) return effect.value;
		}
		return value;
	},
});

/** Returns the extension that keeps in the state whether the editor has focus, so filters can tell the user's own edits from edits forwarded from another pane. */
export function viewFocus(): Extension {
	return [
		viewFocusField,
		EditorView.domEventHandlers({
			focus: (_event, view) => {
				view.dispatch({ effects: setViewFocus.of(true) });
			},
			blur: (_event, view) => {
				view.dispatch({ effects: setViewFocus.of(false) });
			},
		}),
		ViewPlugin.define((view) => {
			const sync = () => {
				if (!view.dom.isConnected) return;
				const known = view.state.field(viewFocusField, false);
				if (known === undefined || known === view.hasFocus) return;
				view.dispatch({ effects: setViewFocus.of(view.hasFocus) });
			};
			queueMicrotask(sync);
			return { update: () => queueMicrotask(sync) };
		}),
	];
}
