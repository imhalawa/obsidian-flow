import type { Plugin } from 'obsidian';
import { registerIndentItem } from './indent-item';
import { registerMoveItemDown } from './move-item-down';
import { registerMoveItemUp } from './move-item-up';
import { registerOutdentItem } from './outdent-item';
import { registerZoomCommands } from './zoom-commands';

/** Registers every command of the plugin. */
export function registerCommands(plugin: Plugin): void {
	registerIndentItem(plugin);
	registerOutdentItem(plugin);
	registerMoveItemUp(plugin);
	registerMoveItemDown(plugin);
	registerZoomCommands(plugin);
}
