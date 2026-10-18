import { MarkdownView, Menu, editorInfoField, type Plugin } from 'obsidian';
import { dispatchZoom, zoomTargetOf } from './zoom-control';
import { zoomPanel } from './zoom-panel';

/** Shows the zoom path in a panel above the text of every note and keeps the note name in step with renames. */
export function registerZoomPanel(plugin: Plugin): void {
	plugin.registerEditorExtension(
		zoomPanel({
			noteName: (view) => view.state.field(editorInfoField, false)?.file?.basename ?? '',
			showHidden: (view, crumbs, anchor) => {
				const menu = new Menu();
				for (const crumb of crumbs) {
					menu.addItem((item) =>
						item
							.setTitle(crumb.label)
							.onClick(() => dispatchZoom(view, crumb.targetLine, 'visit')),
					);
				}
				const box = anchor.getBoundingClientRect();
				menu.showAtPosition({ x: box.left, y: box.bottom });
			},
		}),
	);
	plugin.registerEvent(
		plugin.app.vault.on('rename', () => {
			plugin.app.workspace.iterateAllLeaves((leaf) => {
				if (!(leaf.view instanceof MarkdownView)) return;
				zoomTargetOf(leaf.view.editor)?.dispatch({});
			});
		}),
	);
}
