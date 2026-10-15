import type { Plugin } from 'obsidian';
import { outdentItem } from '../outline/indent';
import { registerTreeCommand } from './tree-command';

/** Registers the command that outdents the selected items. */
export function registerOutdentItem(plugin: Plugin): void {
	registerTreeCommand(plugin, {
		id: 'outdent-item',
		name: 'Outdent item',
		operation: outdentItem,
		bottomUp: false,
	});
}
