import { editorInfoField } from 'obsidian';
import type { Plugin } from 'obsidian';
import { itemDrag } from './item-drag';

export interface ItemDragSettings {
	dragItems: () => boolean;
}

/** Adds drag handles to every editor, and moves items between places and notes. */
export function registerItemDrag(
	plugin: Plugin,
	settings: ItemDragSettings,
	notify: (message: string) => void,
): void {
	plugin.registerEditorExtension(
		itemDrag({
			isEnabled: settings.dragItems,
			fileOf: (view) => view.state.field(editorInfoField, false)?.file?.path ?? null,
			notify,
		}),
	);
}
