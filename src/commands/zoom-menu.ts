import type { Plugin } from 'obsidian';
import { canZoomIn, zoomIn, zoomTargetOf } from '../editor/zoom-control';

/** Adds Zoom in to the menu of the editor when the cursor is on a list item or a heading. */
export function registerZoomMenu(plugin: Plugin): void {
	plugin.registerEvent(
		plugin.app.workspace.on('editor-menu', (menu, editor) => {
			const target = zoomTargetOf(editor);
			if (!target || !canZoomIn(target)) return;
			menu.addItem((item) =>
				item
					.setTitle('Zoom in')
					.setIcon('zoom-in')
					.onClick(() => zoomIn(target)),
			);
		}),
	);
}
