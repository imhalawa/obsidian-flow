import { foldEffect, unfoldEffect } from '@codemirror/language';
import { StateField, type EditorState, type Extension, type Transaction } from '@codemirror/state';
import {
	Decoration,
	EditorView,
	ViewPlugin,
	type DecorationSet,
	type WidgetType,
} from '@codemirror/view';
import { calloutDecorations } from './callout-decorations';

interface CalloutState {
	enabled: boolean;
	decorations: DecorationSet;
}

/** Builds the state of the field for one version of the editor state. */
function build(
	state: EditorState,
	enabled: boolean,
	makeWidget: (markdown: string) => WidgetType,
): CalloutState {
	return {
		enabled,
		decorations: enabled ? calloutDecorations(state, makeWidget) : Decoration.none,
	};
}

/** Returns the extension that shows each callout bullet as a rendered callout while the setting is on. */
export function bulletCallouts(
	isEnabled: () => boolean,
	makeWidget: (markdown: string) => WidgetType,
	layout: (view: EditorView) => void,
): Extension {
	const field = StateField.define<CalloutState>({
		create: (state) => build(state, isEnabled(), makeWidget),
		update(value: CalloutState, transaction: Transaction) {
			const enabled = isEnabled();
			const folds = transaction.effects.some(
				(effect) => effect.is(foldEffect) || effect.is(unfoldEffect),
			);
			if (
				enabled === value.enabled &&
				!transaction.docChanged &&
				!transaction.selection &&
				!folds
			) {
				return value;
			}
			return build(transaction.state, enabled, makeWidget);
		},
		provide: (self) => EditorView.decorations.from(self, (value) => value.decorations),
	});
	const measure = ViewPlugin.define((view) => {
		layout(view);
		return {
			update(update) {
				if (update.docChanged || update.selectionSet || update.geometryChanged) {
					layout(update.view);
				}
			},
		};
	});
	return [field, measure];
}
