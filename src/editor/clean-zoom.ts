import type { Extension } from '@codemirror/state';
import {
	Decoration,
	ViewPlugin,
	type DecorationSet,
	type EditorView,
	type ViewUpdate,
} from '@codemirror/view';
import { cleanZoomDecorations, ZOOM_LINE_CLASS } from './clean-zoom-decorations';
import { zoomField } from './zoom-field';

const SHIFT_PROPERTY = '--roamer-zoom-shift';
// TODO(obsidian-update): undocumented CodeMirror list marker class; if it changes, clean zoom cannot measure the shift and does not move the item. See docs/obsidian-internals.md.
const MARKER_SELECTOR = '.cm-formatting-list';

/** Reads how far the zoomed item sits from the left edge of its line in pixels, from the list marker the editor draws. */
function measuredShift(view: EditorView): number | null {
	const line = view.contentDOM.querySelector<HTMLElement>(`.${ZOOM_LINE_CLASS}`);
	const marker = line?.querySelector<HTMLElement>(MARKER_SELECTOR);
	if (!line || !marker) return null;
	return Math.max(0, marker.getBoundingClientRect().left - line.getBoundingClientRect().left);
}

/** Returns the extension that shows a zoomed item at the left edge of the note when the setting is on. */
export function cleanZoom(isEnabled: () => boolean): Extension {
	return ViewPlugin.define(
		(view) => {
			let enabled = isEnabled();
			const build = (current: EditorView): DecorationSet =>
				enabled ? cleanZoomDecorations(current.state) : Decoration.none;
			let decorations = build(view);
			const measure = (current: EditorView) => {
				current.requestMeasure({
					read: () => ({
						zoomed: decorations.size > 0,
						shift: measuredShift(current),
					}),
					write: (measured) => {
						if (!measured.zoomed || measured.shift === null) {
							current.dom.style.removeProperty(SHIFT_PROPERTY);
							return;
						}
						current.dom.style.setProperty(SHIFT_PROPERTY, `${measured.shift}px`);
					},
				});
			};
			measure(view);
			return {
				get decorations() {
					return decorations;
				},
				update(update: ViewUpdate) {
					const zoomChanged =
						update.startState.field(zoomField, false) !==
						update.state.field(zoomField, false);
					const settingChanged = isEnabled() !== enabled;
					if (settingChanged) enabled = !enabled;
					if (
						zoomChanged ||
						settingChanged ||
						update.docChanged ||
						update.viewportChanged
					) {
						decorations = build(update.view);
						measure(update.view);
					}
				},
				destroy() {
					view.dom.style.removeProperty(SHIFT_PROPERTY);
				},
			};
		},
		{ decorations: (value) => value.decorations },
	);
}
