import { unfoldEffect } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { ViewPlugin, type EditorView, type ViewUpdate } from '@codemirror/view';
import { clearReveal, revealField } from './fold-reveal-field';

export const REVEAL_DURATION_MS = 600;

/** Tells whether an update unfolded something. */
function unfolded(update: ViewUpdate): boolean {
	return update.transactions.some((transaction) =>
		transaction.effects.some((effect) => effect.is(unfoldEffect)),
	);
}

/** Returns the extension that marks the lines an unfold shows, so the stylesheet can animate them, and clears the marks afterwards. */
export function foldReveal(): Extension {
	const timer = ViewPlugin.define((view: EditorView) => {
		let pending: number | null = null;
		const window = view.dom.ownerDocument.defaultView;
		const cancel = () => {
			if (pending !== null) window?.clearTimeout(pending);
			pending = null;
		};
		return {
			update(update) {
				if (!unfolded(update)) return;
				cancel();
				pending =
					window?.setTimeout(() => {
						pending = null;
						view.dispatch({ effects: clearReveal.of(null) });
					}, REVEAL_DURATION_MS) ?? null;
			},
			destroy: cancel,
		};
	});
	return [revealField, timer];
}
