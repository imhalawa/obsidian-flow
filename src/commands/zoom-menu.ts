import { Notice, type Plugin } from 'obsidian';
import { canZoomIn, zoomIn, zoomTargetOf } from '../editor/zoom-control';
import { zoomOutcomeMessage } from '../ui/zoom-messages';

export const ZOOM_MENU_TITLE = 'Zoom in';

/** Adds Zoom in to the menu of the editor when the cursor is on a list item or a heading. */
export function registerZoomMenu(plugin: Plugin): void {
	plugin.registerEvent(
		plugin.app.workspace.on('editor-menu', (menu, editor) => {
			const target = zoomTargetOf(editor);
			if (!target || !canZoomIn(target)) return;
			menu.addItem((item) =>
				item
					.setTitle(ZOOM_MENU_TITLE)
					.setIcon('zoom-in')
					.onClick(() => {
						const message = zoomOutcomeMessage(zoomIn(target));
						if (message) new Notice(message);
					}),
			);
		}),
	);
}
