import type { Extension } from '@codemirror/state';
import { showPanel, type EditorView, type Panel, type ViewUpdate } from '@codemirror/view';
import { createCrumbPath, fitCrumbPath } from '../ui/crumb-path';
import { panelCrumbs, type PanelCrumb } from '../ui/panel-crumbs';
import { dispatchZoom } from './zoom-control';
import { zoomField } from './zoom-field';

export const PANEL_CLASS = 'roamer-crumb-panel';

export interface ZoomPanelHost {
	noteName(view: EditorView): string;
	showHidden(view: EditorView, crumbs: readonly PanelCrumb[], anchor: HTMLElement): void;
}

/** Returns a text that is equal for two sets of crumbs exactly when they draw the same. */
function signature(crumbs: readonly PanelCrumb[]): string {
	return JSON.stringify(crumbs.map((crumb) => [crumb.label, crumb.targetLine]));
}

/** Builds the panel that shows the zoom path above the text of one editor. */
function createZoomPanel(view: EditorView, host: ZoomPanelHost): Panel {
	const dom = createDiv({ cls: PANEL_CLASS });
	let drawn = '';
	const draw = () => {
		const zoom = view.state.field(zoomField, false);
		if (!zoom) return;
		const crumbs = panelCrumbs(host.noteName(view), zoom.crumbs);
		const next = signature(crumbs);
		if (next === drawn) return;
		drawn = next;
		dom.empty();
		dom.append(
			createCrumbPath(crumbs, {
				zoomTo: (line) => dispatchZoom(view, line, 'visit'),
				showHidden: (hidden, anchor) => host.showHidden(view, hidden, anchor),
			}),
		);
		fit();
	};
	const fit = () => {
		const path = dom.firstElementChild;
		if (path instanceof HTMLElement) fitCrumbPath(path);
	};
	const observer = new ResizeObserver(fit);
	observer.observe(dom);
	draw();
	return {
		dom,
		top: true,
		mount: fit,
		update: (_update: ViewUpdate) => draw(),
		destroy: () => observer.disconnect(),
	};
}

/** Returns the extension that shows the zoom path in a panel above the text while an item is zoomed. */
export function zoomPanel(host: ZoomPanelHost): Extension {
	const constructor = (view: EditorView): Panel => createZoomPanel(view, host);
	return showPanel.from(zoomField, (zoom) => (zoom ? constructor : null));
}
