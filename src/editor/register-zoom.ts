import type { Plugin } from 'obsidian';
import { ZOOM_REMOVED_MESSAGE } from '../ui/zoom-messages';
import { zoomExtension } from './zoom-extension';
import { ZoomMemory } from './zoom-memory';
import { zoomPersistence } from './zoom-persistence';

export const ZOOM_STORAGE_KEY = 'flow-outliner-zoom';

export interface ZoomPluginHost {
	rememberZoom(): boolean;
	notify(message: string): void;
}

/** Adds zooming to every editor and keeps what is remembered in step with vault changes. */
export function registerZoom(plugin: Plugin, host: ZoomPluginHost): ZoomMemory {
	const app = plugin.app;
	const memory = new ZoomMemory(
		{
			read: () => app.loadLocalStorage(ZOOM_STORAGE_KEY) as unknown,
			write: (data) => app.saveLocalStorage(ZOOM_STORAGE_KEY, data),
		},
		() => Date.now(),
		() => host.rememberZoom(),
	);
	plugin.registerEditorExtension([
		zoomExtension(() => host.notify(ZOOM_REMOVED_MESSAGE)),
		zoomPersistence(memory),
	]);
	plugin.registerEvent(
		app.vault.on('rename', (file, oldPath) => memory.rename(oldPath, file.path)),
	);
	plugin.registerEvent(app.vault.on('delete', (file) => memory.forget(file.path)));
	return memory;
}
