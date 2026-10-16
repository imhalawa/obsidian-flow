import { Menu, MarkdownView, Notice, type App, type Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { drawHeaderPath, fitHeaderPath, removeHeaderPath } from '../ui/header-path';
import { headerCrumbs, type HeaderCrumb } from '../ui/header-crumbs';
import { dispatchZoom, zoomTargetOf } from './zoom-control';
import { zoomField } from './zoom-field';

const TITLE_CONTAINER_SELECTOR = '.view-header-title-container';
export const HEADER_MISSING_MESSAGE =
	'Flow Outliner cannot show the zoom path in the note header of this Obsidian version.';

/** Returns the element that holds the title in the header of a note view, or null when the view has none. */
function titleContainer(view: MarkdownView): HTMLElement | null {
	return view.containerEl.querySelector<HTMLElement>(TITLE_CONTAINER_SELECTOR);
}

/** Returns the extension that tells when the zoom of an editor changed. */
export function zoomChangeListener(onChange: () => void): Extension {
	return EditorView.updateListener.of((update) => {
		if (update.startState.field(zoomField, false) !== update.state.field(zoomField, false)) {
			onChange();
		}
	});
}

/** Draws the zoom path of every open note into that note's own header and keeps it fitted. */
export class ZoomHeader {
	private readonly observers = new Map<HTMLElement, ResizeObserver>();
	private reported = false;

	constructor(private readonly app: App) {}

	/** Draws or removes the path in every open note view. */
	redraw(): void {
		const seen = new Set<HTMLElement>();
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			const container = this.drawIn(leaf.view);
			if (container) seen.add(container);
		});
		for (const [container, observer] of this.observers) {
			if (seen.has(container) && container.isConnected) continue;
			observer.disconnect();
			this.observers.delete(container);
		}
	}

	/** Removes every path and stops watching the headers. */
	clear(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			const container = titleContainer(leaf.view);
			if (container) removeHeaderPath(container);
		});
		for (const observer of this.observers.values()) observer.disconnect();
		this.observers.clear();
	}

	private drawIn(view: MarkdownView): HTMLElement | null {
		const container = titleContainer(view);
		const target = zoomTargetOf(view.editor);
		const zoom = target?.state.field(zoomField);
		if (!container) {
			if (zoom) this.reportMissing();
			return null;
		}
		if (!target || !zoom) {
			removeHeaderPath(container);
			return null;
		}
		drawHeaderPath(container, headerCrumbs(zoom.crumbs), {
			zoomTo: (line) => dispatchZoom(target, line, 'visit'),
			showHidden: (crumbs, anchor) => this.showHidden(target, crumbs, anchor),
		});
		this.watch(container);
		return container;
	}

	private watch(container: HTMLElement): void {
		if (this.observers.has(container)) return;
		const observer = new ResizeObserver(() => fitHeaderPath(container));
		observer.observe(container);
		this.observers.set(container, observer);
	}

	private showHidden(
		target: NonNullable<ReturnType<typeof zoomTargetOf>>,
		crumbs: readonly HeaderCrumb[],
		anchor: HTMLElement,
	): void {
		const menu = new Menu();
		for (const crumb of crumbs) {
			menu.addItem((item) =>
				item
					.setTitle(crumb.label)
					.onClick(() => dispatchZoom(target, crumb.targetLine, 'visit')),
			);
		}
		const box = anchor.getBoundingClientRect();
		menu.showAtPosition({ x: box.left, y: box.bottom });
	}

	private reportMissing(): void {
		if (this.reported) return;
		this.reported = true;
		new Notice(HEADER_MISSING_MESSAGE);
	}
}

/** Keeps the zoom path in the note header in step with zooming, layout changes and renames. */
export function registerZoomHeader(plugin: Plugin): void {
	const app = plugin.app;
	const header = new ZoomHeader(app);
	const redraw = () => header.redraw();
	plugin.registerEvent(app.workspace.on('layout-change', redraw));
	plugin.registerEvent(app.workspace.on('active-leaf-change', redraw));
	plugin.registerEvent(app.workspace.on('file-open', redraw));
	plugin.registerEvent(app.vault.on('rename', redraw));
	app.workspace.onLayoutReady(redraw);
	plugin.register(() => header.clear());
	plugin.registerEditorExtension(zoomChangeListener(redraw));
}
