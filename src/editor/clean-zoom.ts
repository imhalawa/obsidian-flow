import type { Extension } from '@codemirror/state';
import {
	Decoration,
	ViewPlugin,
	type DecorationSet,
	type EditorView,
	type ViewUpdate,
} from '@codemirror/view';
import { cleanZoomDecorations, ZOOM_LINE_CLASS, zoomedLevels } from './clean-zoom-decorations';
import { zoomField } from './zoom-field';

const ZOOMED_CLASS = 'flow-zoomed';
const LEVEL_WIDTH_PROPERTY = '--flow-zoom-level-px';
const SHIFT_PROPERTY = '--flow-zoom-shift';

/** Reads the width of one indent level in pixels from the first indent the zoomed lines draw. */
function measuredLevelWidth(view: EditorView): number {
	const indent = view.contentDOM.querySelector<HTMLElement>(`.${ZOOM_LINE_CLASS} .cm-indent`);
	if (indent && indent.offsetWidth > 0) return indent.offsetWidth;
	return view.defaultCharacterWidth * view.state.tabSize;
}

/** Returns the extension that shows a zoomed item at the left edge of the note when the setting is on. */
export function cleanZoom(isEnabled: () => boolean): Extension {
	return ViewPlugin.define(
		(view) => {
			const build = (current: EditorView): DecorationSet =>
				isEnabled() ? cleanZoomDecorations(current.state) : Decoration.none;
			let decorations = build(view);
			const measure = (current: EditorView) => {
				current.requestMeasure({
					read: () => ({
						zoomed: decorations.size > 0,
						levelWidth: measuredLevelWidth(current),
						levels: zoomedLevels(current.state),
					}),
					write: (measured) => {
						current.dom.classList.toggle(ZOOMED_CLASS, measured.zoomed);
						if (!measured.zoomed) {
							current.dom.style.removeProperty(LEVEL_WIDTH_PROPERTY);
							current.dom.style.removeProperty(SHIFT_PROPERTY);
							return;
						}
						current.dom.style.setProperty(
							LEVEL_WIDTH_PROPERTY,
							`${measured.levelWidth}px`,
						);
						current.dom.style.setProperty(
							SHIFT_PROPERTY,
							`${measured.levels * measured.levelWidth}px`,
						);
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
					if (zoomChanged || update.docChanged || update.viewportChanged) {
						decorations = build(update.view);
						measure(update.view);
					}
				},
				destroy() {
					view.dom.classList.remove(ZOOMED_CLASS);
					view.dom.style.removeProperty(LEVEL_WIDTH_PROPERTY);
					view.dom.style.removeProperty(SHIFT_PROPERTY);
				},
			};
		},
		{ decorations: (value) => value.decorations },
	);
}
