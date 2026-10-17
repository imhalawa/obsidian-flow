import { WidgetType, type EditorView } from '@codemirror/view';
import { Component, MarkdownRenderer, editorInfoField, type App } from 'obsidian';
import { CALLOUT_LINE_CLASS } from './callout-decorations';

export const CALLOUT_WIDGET_CLASS = 'flow-callout-widget';
const SHIFT_PROPERTY = '--flow-bullet-shift';
const LAYOUT_KEY = 'flow-callout-layout';
const INTERACTIVE = 'a, button, input, .callout-fold';
const components = new WeakMap<HTMLElement, Component>();

/** Moves the bullet of each callout line down to the middle of the callout title. */
export function layoutCallouts(view: EditorView): void {
	view.requestMeasure({
		key: LAYOUT_KEY,
		read: () =>
			Array.from(
				view.contentDOM.querySelectorAll<HTMLElement>(`.${CALLOUT_LINE_CLASS}`),
			).flatMap((line) => {
				const bullet = line.querySelector('.list-bullet');
				const title = line.querySelector('.callout-title');
				if (!bullet || !title) return [];
				const current = parseFloat(line.style.getPropertyValue(SHIFT_PROPERTY));
				const bulletBox = bullet.getBoundingClientRect();
				const titleBox = title.getBoundingClientRect();
				const gap =
					titleBox.top + titleBox.height / 2 - (bulletBox.top + bulletBox.height / 2);
				return [{ line, shift: (Number.isNaN(current) ? 0 : current) + gap }];
			}),
		write: (items) => {
			for (const { line, shift } of items) {
				line.setCssProps({ [SHIFT_PROPERTY]: `${Math.round(shift)}px` });
			}
		},
	});
}

/** A callout drawn by Obsidian's own markdown renderer in place of the text of a callout bullet. */
export class CalloutWidget extends WidgetType {
	constructor(
		private readonly markdown: string,
		private readonly app: App,
	) {
		super();
	}

	eq(other: WidgetType): boolean {
		return other instanceof CalloutWidget && other.markdown === this.markdown;
	}

	toDOM(view: EditorView): HTMLElement {
		const element = createSpan({ cls: CALLOUT_WIDGET_CLASS });
		const component = new Component();
		component.load();
		components.set(element, component);
		const path = view.state.field(editorInfoField, false)?.file?.path ?? '';
		MarkdownRenderer.render(this.app, this.markdown, element, path, component).then(
			() => layoutCallouts(view),
			() => undefined,
		);
		element.addEventListener('mousedown', (event) => {
			const target = event.target;
			if (event.button !== 0 || (target instanceof Element && target.closest(INTERACTIVE)))
				return;
			event.preventDefault();
			view.dispatch({ selection: { anchor: view.posAtDOM(element) }, scrollIntoView: true });
			view.focus();
		});
		return element;
	}

	destroy(dom: HTMLElement): void {
		components.get(dom)?.unload();
		components.delete(dom);
	}

	ignoreEvent(): boolean {
		return true;
	}
}
