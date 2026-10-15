import type { Plugin } from 'obsidian';
import { copyLinkToItem, type BlockLinkServices } from '../commands/copy-item-link';
import { showItemMenu } from '../ui/item-menu';
import { ensureBlockIdOnLine } from './block-link';
import { itemPointer } from './item-pointer';
import { editorInfoField } from 'obsidian';

export interface ItemPointerSettings {
	clickBulletToZoom: () => boolean;
	clickThreadLineToFold: () => boolean;
}

/** Adds bullet and thread line clicks and the item menu to every editor. */
export function registerItemPointer(
	plugin: Plugin,
	settings: ItemPointerSettings,
	services: BlockLinkServices,
): void {
	plugin.registerEditorExtension(
		itemPointer({
			isBulletZoomEnabled: settings.clickBulletToZoom,
			isThreadFoldEnabled: settings.clickThreadLineToFold,
			showMenu: showItemMenu,
			copyLink: (view, startLine) => {
				const file = view.state.field(editorInfoField).file;
				if (!file) return;
				copyLinkToItem(
					plugin,
					file,
					ensureBlockIdOnLine(view, startLine, services.random),
					services,
				);
			},
		}),
	);
}
