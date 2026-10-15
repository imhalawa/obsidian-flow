import type { Plugin } from 'obsidian';
import { moveItemUp } from '../outline/move';
import { registerTreeCommand } from './tree-command';

/** Registers the command that moves the selected items up. */
export function registerMoveItemUp(plugin: Plugin): void {
	registerTreeCommand(plugin, {
		id: 'move-item-up',
		name: 'Move item up',
		operation: moveItemUp,
		bottomUp: false,
	});
}
