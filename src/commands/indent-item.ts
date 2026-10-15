import type { Plugin } from 'obsidian';
import { indentItem } from '../outline/indent';
import { registerTreeCommand } from './tree-command';

/** Registers the command that indents the selected items. */
export function registerIndentItem(plugin: Plugin): void {
	registerTreeCommand(plugin, {
		id: 'indent-item',
		name: 'Indent item',
		operation: indentItem,
		bottomUp: false,
	});
}
