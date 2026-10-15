export type ItemMenuAction = 'zoom' | 'fold' | 'unfold' | 'copy-link';

export const ITEM_MENU_TITLES: Record<ItemMenuAction, string> = {
	zoom: 'Zoom into item',
	fold: 'Fold item',
	unfold: 'Unfold item',
	'copy-link': 'Copy link to item',
};

/** Returns the actions the menu of an item offers, in order. */
export function itemMenuActions(hasChildren: boolean, folded: boolean): ItemMenuAction[] {
	const actions: ItemMenuAction[] = ['zoom'];
	if (hasChildren) actions.push(folded ? 'unfold' : 'fold');
	actions.push('copy-link');
	return actions;
}

export interface ItemMenuEntry {
	title: string;
	run: () => void;
}
