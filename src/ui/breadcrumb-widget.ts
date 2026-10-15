import { WidgetType, type EditorView } from '@codemirror/view';
import type { Breadcrumb } from '../outline/zoom';
import { zoomChange } from '../editor/zoom-field';
import { crumbItems, type CrumbItem } from './breadcrumb-model';

/** Draws the breadcrumb trail above the zoomed content. */
export class BreadcrumbWidget extends WidgetType {
	constructor(private readonly path: readonly Breadcrumb[]) {
		super();
	}

	eq(other: BreadcrumbWidget): boolean {
		return (
			this.path.length === other.path.length &&
			this.path.every((crumb, index) => {
				const same = other.path[index];
				return same?.text === crumb.text && same.startLine === crumb.startLine;
			})
		);
	}

	toDOM(view: EditorView): HTMLElement {
		const nav = createEl('nav', {
			cls: 'flow-breadcrumbs',
			attr: { 'aria-label': 'Zoom path' },
		});
		for (const item of crumbItems(this.path)) nav.append(this.crumb(view, item));
		return nav;
	}

	private crumb(view: EditorView, item: CrumbItem): HTMLElement {
		if (item.current) {
			return createSpan({
				cls: 'flow-breadcrumbs__crumb is-current',
				text: item.label,
				attr: { 'aria-current': 'location' },
			});
		}
		const button = createEl('button', {
			cls: 'flow-breadcrumbs__crumb',
			text: item.label,
			attr: { type: 'button', 'aria-label': item.description },
		});
		button.addEventListener('click', () => {
			view.dispatch({
				effects: zoomChange.of({ startLine: item.targetLine, navigation: 'visit' }),
			});
		});
		return button;
	}
}
