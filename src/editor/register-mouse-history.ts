import { MarkdownView, Notice, type App, type Plugin } from 'obsidian';
import { wrapHistory } from './history-wrapper';
import { zoomTargetOf } from './zoom-control';
import { stepZoomHistory } from './zoom-history-step';

export interface MouseHistoryHost {
	isEnabled: () => boolean;
}

/** Steps the zoom history of the active editor when it lives in the given window. */
function stepActiveEditor(app: App, win: Window, direction: 'back' | 'forward'): boolean {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view || view.containerEl.ownerDocument.defaultView !== win) return false;
	return stepZoomHistory(zoomTargetOf(view.editor), direction, (message) => new Notice(message));
}

/** Makes the mouse back and forward buttons step through zoom levels first, in every window. */
export function registerMouseHistory(plugin: Plugin, host: MouseHistoryHost): void {
	const app = plugin.app;
	const restores = new Map<Window, () => void>();
	const install = (win: Window) => {
		if (restores.has(win)) return;
		restores.set(
			win,
			wrapHistory(win, {
				isEnabled: host.isEnabled,
				step: (direction) => stepActiveEditor(app, win, direction),
			}),
		);
	};
	const release = (win: Window) => {
		restores.get(win)?.();
		restores.delete(win);
	};
	// TODO(obsidian-update): wraps window.history; depends on mouse buttons 3 and 4 reaching history.back/forward. See docs/obsidian-internals.md.
	const mainWindow = app.workspace.containerEl.ownerDocument.defaultView;
	if (mainWindow) install(mainWindow);
	app.workspace.onLayoutReady(() => {
		app.workspace.iterateAllLeaves((leaf) => {
			const win = leaf.view.containerEl.ownerDocument.defaultView;
			if (win) install(win);
		});
	});
	plugin.registerEvent(app.workspace.on('window-open', (_workspaceWindow, win) => install(win)));
	plugin.registerEvent(app.workspace.on('window-close', (_workspaceWindow, win) => release(win)));
	plugin.register(() => {
		for (const restore of restores.values()) restore();
		restores.clear();
	});
}
