import { beforeEach, describe, expect, it } from 'vitest';
import { registerZoomMenu, ZOOM_MENU_TITLE } from '../../src/commands/zoom-menu';
import { Notice, Plugin } from '../mocks/obsidian';
import { FakeApp } from '../support/fake-app';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['# Launch', 'intro', '- a', '  - b', '', 'plain text'].join('\n');
const at = (text: string) => NOTE.indexOf(text);

class FakeMenuItem {
	title = '';
	icon = '';
	click: () => void = () => undefined;
	setTitle(title: string): this {
		this.title = title;
		return this;
	}
	setIcon(icon: string): this {
		this.icon = icon;
		return this;
	}
	onClick(click: () => void): this {
		this.click = click;
		return this;
	}
}

class FakeMenu {
	items: FakeMenuItem[] = [];
	addItem(build: (item: FakeMenuItem) => void): this {
		const item = new FakeMenuItem();
		build(item);
		this.items.push(item);
		return this;
	}
}

let app: FakeApp;

beforeEach(() => {
	Notice.shown.length = 0;
	app = new FakeApp();
	registerZoomMenu(new Plugin(app) as never);
});

const openMenu = (editor: object): FakeMenu => {
	const menu = new FakeMenu();
	const handler = app.workspaceHandlers.get('editor-menu') as unknown as (
		menu: FakeMenu,
		editor: object,
	) => void;
	handler(menu, editor);
	return menu;
};

describe('zoom menu', () => {
	it('listens to the menu of the editor', () => {
		expect([...app.workspaceHandlers.keys()]).toEqual(['editor-menu']);
	});

	it.each([
		['a heading', at('# Launch')],
		['text under a heading', at('intro')],
		['a list item', at('- a')],
		['a nested list item', at('- b')],
	])('offers Zoom in on %s', (_description, caret) => {
		const menu = openMenu({ cm: new FakeZoomTarget(NOTE, caret) });
		expect(menu.items.map((item) => [item.title, item.icon])).toEqual([
			[ZOOM_MENU_TITLE, 'zoom-in'],
		]);
	});

	it('offers nothing in an editor without the zoom extension', () => {
		expect(openMenu({}).items).toEqual([]);
	});

	it('offers nothing on a line outside any heading or item', () => {
		const menu = openMenu({ cm: new FakeZoomTarget('plain text', 3) });
		expect(menu.items).toEqual([]);
	});

	it('zooms into the heading when the item is chosen', () => {
		const target = new FakeZoomTarget(NOTE, at('# Launch'));
		openMenu({ cm: target }).items[0]?.click();
		expect(target.zoom?.crumbs.map((crumb) => crumb.text)).toEqual(['Launch']);
	});
});
