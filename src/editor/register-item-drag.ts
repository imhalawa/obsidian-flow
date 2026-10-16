import { editorInfoField } from 'obsidian';
import type { Plugin } from 'obsidian';
import { itemDrag, type ItemDrag } from './item-drag';

export interface ItemDragSettings {
	dragItems: () => boolean;
}

/** Lets items be dragged by their bullet in every editor, and returns the function that starts a drag. */
export function registerItemDrag(
	plugin: Plugin,
	settings: ItemDragSettings,
	notify: (message: string) => void,
): ItemDrag['begin'] {
	const drag = itemDrag({
		isEnabled: settings.dragItems,
		fileOf: (view) => view.state.field(editorInfoField, false)?.file?.path ?? null,
		notify,
	});
	plugin.registerEditorExtension(drag.extension);
	return drag.begin;
}
