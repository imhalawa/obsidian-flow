import type { Extension } from '@codemirror/state';
import {
	Decoration,
	EditorView,
	ViewPlugin,
	type DecorationSet,
	type ViewUpdate,
} from '@codemirror/view';
import type { IdSpan } from '../outline/block-id';
import { findIdSpans, hiddenIdDecorations, sameLines, selectedLines } from './block-id-decorations';

/** Returns the extension that hides block ids away from the cursor, while the setting is on. */
export function blockIdHiding(isEnabled: () => boolean): Extension {
	const plugin = ViewPlugin.define(
		(view: EditorView) => {
			let enabled = isEnabled();
			let spans: IdSpan[] = enabled ? findIdSpans(view.state) : [];
			const build = (state: EditorView['state']): DecorationSet =>
				enabled ? hiddenIdDecorations(state, spans) : Decoration.none;
			let decorations = build(view.state);
			let touched = selectedLines(view.state, view.state.selection);
			return {
				get decorations() {
					return decorations;
				},
				update(update: ViewUpdate) {
					const wasEnabled = enabled;
					enabled = isEnabled();
					if (update.docChanged || enabled !== wasEnabled) {
						spans = enabled ? findIdSpans(update.state) : [];
						decorations = build(update.state);
						touched = selectedLines(update.state, update.state.selection);
					} else if (update.selectionSet) {
						const next = selectedLines(update.state, update.state.selection);
						if (sameLines(touched, next)) return;
						touched = next;
						decorations = build(update.state);
					}
				},
			};
		},
		{
			decorations: (value) => value.decorations,
			provide: (self) =>
				EditorView.atomicRanges.of(
					(view) => view.plugin(self)?.decorations ?? Decoration.none,
				),
		},
	);
	return plugin;
}
