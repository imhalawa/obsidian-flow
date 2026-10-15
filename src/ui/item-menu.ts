import { Menu } from 'obsidian';
import type { ItemMenuEntry } from './item-menu-model';

/** Shows a menu of item actions where the pointer is. */
export function showItemMenu(event: MouseEvent, entries: readonly ItemMenuEntry[]): void {
	const menu = new Menu();
	for (const entry of entries) {
		menu.addItem((item) => item.setTitle(entry.title).onClick(entry.run));
	}
	menu.showAtMouseEvent(event);
}
