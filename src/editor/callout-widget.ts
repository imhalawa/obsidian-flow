import { WidgetType, type EditorView } from '@codemirror/view';
import { Component, MarkdownRenderer, editorInfoField, type App } from 'obsidian';
import { CALLOUT_LINE_CLASS } from './callout-decorations';

export const CALLOUT_WIDGET_CLASS = 'roamer-callout-widget';
const SHIFT_PROPERTY = '--roamer-bullet-shift';
export const GUIDE_X_PROPERTY = '--roamer-guide-x';
const GUIDE_TOP_PROPERTY = '--roamer-guide-top';
const GUIDE_GAP = 2;
const WRAP_DISTANCE = 8;
const DOT_OFFSET = 9.6;
const DOT_SIZE = 4.8;
const LAYOUT_KEY = 'roamer-callout-layout';
const INTERACTIVE = 'a, button, input, .callout-fold';
const components = new WeakMap<HTMLElement, Component>();
const observers = new WeakMap<HTMLElement, ResizeObserver>();

/** Parses a computed length in pixels, or returns the fallback when it is not a number. */
function pixels(value: string, fallback: number): number {
	const parsed = parseFloat(value);
	return Number.isNaN(parsed) ? fallback : parsed;
}

/** Reads the geometry of the callout lines and sets the properties that place their bullet and the guide of their children. */
export function layoutCallouts(view: EditorView): void {
	view.requestMeasure({
		key: LAYOUT_KEY,
		read: () =>
			Array.from(
				view.contentDOM.querySelectorAll<HTMLElement>(`.${CALLOUT_LINE_CLASS}`),
			).flatMap((line) => {
				// TODO(obsidian-update): undocumented Obsidian callout and bullet markup (.list-bullet, .callout-title); layout breaks if renamed. See docs/obsidian-internals.md.
				const bullet = line.querySelector('.list-bullet');
				const title = line.querySelector('.callout-title');
				const widget = line.querySelector(`.${CALLOUT_WIDGET_CLASS}`);
				if (!bullet || !title || !widget) return [];
				const current = parseFloat(line.style.getPropertyValue(SHIFT_PROPERTY));
				const applied = Number.isNaN(current) ? 0 : current;
				const dot = getComputedStyle(bullet, '::after');
				const dotOffset = pixels(dot.top, DOT_OFFSET);
				const dotSize = pixels(dot.height, DOT_SIZE);
				const lineBox = line.getBoundingClientRect();
				const bulletBox = bullet.getBoundingClientRect();
				const widgetBox = widget.getBoundingClientRect();
				const dotTop = bulletBox.top - applied + dotOffset;
				const wrapped = widgetBox.top - lineBox.top > WRAP_DISTANCE;
				const shift = wrapped ? 0 : widgetBox.top - dotTop;
				return [
					{
						line,
						shift,
						guideX: (bulletBox.left + bulletBox.right) / 2 - lineBox.left,
						guideTop: dotTop + shift - lineBox.top + dotSize + GUIDE_GAP,
					},
				];
			}),
		write: (items) => {
			for (const { line, shift, guideX, guideTop } of items) {
				line.setCssProps({
					[SHIFT_PROPERTY]: `${Math.round(shift)}px`,
					[GUIDE_X_PROPERTY]: `${Math.round(guideX)}px`,
					[GUIDE_TOP_PROPERTY]: `${Math.round(guideTop)}px`,
				});
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
		const observer = new ResizeObserver(() => layoutCallouts(view));
		observer.observe(element);
		observers.set(element, observer);
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
		observers.get(dom)?.disconnect();
		observers.delete(dom);
		components.get(dom)?.unload();
		components.delete(dom);
	}

	ignoreEvent(): boolean {
		return true;
	}
}
