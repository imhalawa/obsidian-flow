import type { Plugin } from 'obsidian';
import { moveItemDown } from '../outline/move';
import { registerTreeCommand } from './tree-command';

/** Registers the command that moves the selected items down. */
export function registerMoveItemDown(plugin: Plugin): void {
	registerTreeCommand(plugin, {
		id: 'move-item-down',
		name: 'Move item down',
		operation: moveItemDown,
		bottomUp: true,
	});
}
