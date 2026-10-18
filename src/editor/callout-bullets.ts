import { foldEffect, unfoldEffect } from '@codemirror/language';
import { StateField, type EditorState, type Extension, type Transaction } from '@codemirror/state';
import {
	Decoration,
	EditorView,
	ViewPlugin,
	type DecorationSet,
	type WidgetType,
} from '@codemirror/view';
import { CALLOUT_LINE_CLASS, calloutDecorations } from './callout-decorations';
import { GUIDE_X_PROPERTY } from './callout-widget';

interface CalloutState {
	enabled: boolean;
	decorations: DecorationSet;
}

/** Tells whether any transaction folds or unfolds a range. */
export function hasFoldChange(transactions: readonly Transaction[]): boolean {
	return transactions.some((transaction) =>
		transaction.effects.some((effect) => effect.is(foldEffect) || effect.is(unfoldEffect)),
	);
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
			const folds = hasFoldChange([transaction]);
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
		const lost = new MutationObserver((mutations) => {
			const stripped = mutations.some(
				(mutation) =>
					mutation.target.instanceOf(HTMLElement) &&
					mutation.target.classList.contains(CALLOUT_LINE_CLASS) &&
					!mutation.target.style.getPropertyValue(GUIDE_X_PROPERTY),
			);
			if (stripped) layout(view);
		});
		lost.observe(view.contentDOM, {
			subtree: true,
			attributes: true,
			attributeFilter: ['style', 'class'],
		});
		return {
			update(update) {
				if (
					update.docChanged ||
					update.selectionSet ||
					update.geometryChanged ||
					hasFoldChange(update.transactions)
				) {
					layout(update.view);
				}
			},
			destroy() {
				lost.disconnect();
			},
		};
	});
	return [field, measure];
}
