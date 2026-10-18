import type { Plugin } from 'obsidian';
import { ZOOM_REMOVED_MESSAGE } from '../ui/zoom-messages';
import { cleanZoom } from './clean-zoom';
import { zoomExtension } from './zoom-extension';
import { ZoomMemory } from './zoom-memory';
import { zoomPersistence } from './zoom-persistence';

export const ZOOM_STORAGE_KEY = 'roamer-zoom';

export interface ZoomPluginHost {
	rememberZoom(): boolean;
	cleanZoom(): boolean;
	notify(message: string): void;
}

/** Adds zooming to every editor and keeps what is remembered in step with vault changes. */
export function registerZoom(plugin: Plugin, host: ZoomPluginHost): ZoomMemory {
	const app = plugin.app;
	const memory = new ZoomMemory(
		{
			// TODO(obsidian-update): app.loadLocalStorage/saveLocalStorage are thin API; check they still exist after updates. See docs/obsidian-internals.md.
			read: () => app.loadLocalStorage(ZOOM_STORAGE_KEY) as unknown,
			write: (data) => app.saveLocalStorage(ZOOM_STORAGE_KEY, data),
		},
		() => Date.now(),
		() => host.rememberZoom(),
	);
	plugin.registerEditorExtension([
		zoomExtension(() => host.notify(ZOOM_REMOVED_MESSAGE)),
		zoomPersistence(memory),
		cleanZoom(() => host.cleanZoom()),
	]);
	plugin.registerEvent(
		app.vault.on('rename', (file, oldPath) => memory.rename(oldPath, file.path)),
	);
	plugin.registerEvent(app.vault.on('delete', (file) => memory.forget(file.path)));
	return memory;
}
