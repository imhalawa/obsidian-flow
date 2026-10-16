import { type Extension, type Range, type EditorState } from '@codemirror/state';
import {
	Decoration,
	ViewPlugin,
	WidgetType,
	type DecorationSet,
	type EditorView,
	type ViewUpdate,
} from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { outlineOfState } from './outline-of-state';
import { zoomField } from './zoom-field';

export type BeginDrag = (view: EditorView, event: PointerEvent, grip: HTMLElement) => void;

const LINE_CLASS = 'flow-list-line';
const HANDLE_LABEL = 'Drag to move item';

class HandleWidget extends WidgetType {
	constructor(private readonly begin: BeginDrag) {
		super();
	}

	eq(other: WidgetType): boolean {
		return other instanceof HandleWidget;
	}

	ignoreEvent(): boolean {
		return true;
	}

	toDOM(view: EditorView): HTMLElement {
		const document = view.dom.ownerDocument;
		const anchor = document.createElement('span');
		anchor.className = 'flow-drag-handle';
		const grip = document.createElement('span');
		grip.className = 'flow-drag-handle__grip';
		grip.setAttribute('role', 'img');
		grip.setAttribute('aria-label', HANDLE_LABEL);
		grip.addEventListener('pointerdown', (event) => this.begin(view, event, grip));
		anchor.appendChild(grip);
		return anchor;
	}
}

/** Returns a grip and a line class for every visible list item line. */
function handleDecorations(state: EditorState, widget: HandleWidget): DecorationSet {
	if (!state.field(editorLivePreviewField, false)) return Decoration.none;
	const zoom = state.field(zoomField, false);
	const lineDecoration = Decoration.line({ class: LINE_CLASS });
	const gripDecoration = Decoration.widget({ widget, side: -1 });
	const ranges: Range<Decoration>[] = [];
	for (const item of outlineOfState(state).nodes) {
		const line = state.doc.line(item.startLine + 1);
		if (zoom && (line.from < zoom.from || line.to > zoom.to)) continue;
		ranges.push(lineDecoration.range(line.from), gripDecoration.range(line.from));
	}
	return Decoration.set(ranges, true);
}

/** Returns the extension that draws a drag handle at the start of every list item. */
export function dragHandles(isEnabled: () => boolean, begin: BeginDrag): Extension {
	const widget = new HandleWidget(begin);
	return ViewPlugin.define(
		(view) => {
			let enabled = isEnabled();
			let decorations = enabled ? handleDecorations(view.state, widget) : Decoration.none;
			return {
				get decorations() {
					return decorations;
				},
				update(update: ViewUpdate) {
					const wasEnabled = enabled;
					enabled = isEnabled();
					const changed =
						update.docChanged ||
						enabled !== wasEnabled ||
						update.startState.field(zoomField, false) !==
							update.state.field(zoomField, false) ||
						update.startState.field(editorLivePreviewField, false) !==
							update.state.field(editorLivePreviewField, false);
					if (changed) {
						decorations = enabled
							? handleDecorations(update.state, widget)
							: Decoration.none;
					}
				},
			};
		},
		{ decorations: (value) => value.decorations },
	);
}
