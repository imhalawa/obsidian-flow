import type { Plugin } from 'obsidian';
import { showItemMenu } from '../ui/item-menu';
import { itemPointer, type ItemPointerHost } from './item-pointer';

export interface ItemPointerSettings {
	clickBulletToZoom: () => boolean;
	dragBullet: () => boolean;
	clickThreadLineToFold: () => boolean;
}

/** Adds bullet and thread line clicks and the item menu to every editor. */
export function registerItemPointer(
	plugin: Plugin,
	settings: ItemPointerSettings,
	beginDrag: ItemPointerHost['beginDrag'],
): void {
	plugin.registerEditorExtension(
		itemPointer({
			isBulletZoomEnabled: settings.clickBulletToZoom,
			isBulletDragEnabled: settings.dragBullet,
			beginDrag,
			isThreadFoldEnabled: settings.clickThreadLineToFold,
			showMenu: showItemMenu,
		}),
	);
}
