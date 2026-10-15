import { describe, expect, it } from 'vitest';
import { ITEM_MENU_TITLES, itemMenuActions } from '../../src/ui/item-menu-model';

describe('itemMenuActions', () => {
	it.each([
		['a leaf', false, false, ['zoom', 'copy-link']],
		['an open item with children', true, false, ['zoom', 'fold', 'copy-link']],
		['a folded item with children', true, true, ['zoom', 'unfold', 'copy-link']],
	] as const)('offers for %s', (_name, hasChildren, folded, expected) => {
		expect(itemMenuActions(hasChildren, folded)).toEqual(expected);
	});
});

describe('ITEM_MENU_TITLES', () => {
	it('names every action in sentence case', () => {
		expect(ITEM_MENU_TITLES).toEqual({
			zoom: 'Zoom into item',
			fold: 'Fold item',
			unfold: 'Unfold item',
			'copy-link': 'Copy link to item',
		});
	});
});
