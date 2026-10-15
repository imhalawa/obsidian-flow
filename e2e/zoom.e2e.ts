import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
});

afterAll(async () => {
	await app.stop();
});

const NOTE = 'intro\n- a\n\t- b\n\t\t- c\n\t- d\n- e';

describe('zoom in real Obsidian', () => {
	it('shows only the zoomed item and its children with a breadcrumb trail', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		expect(await editor.runCommand('zoom-in')).toBe(true);
		expect(await editor.visibleLines()).toEqual(['\t- b', '\t\t- c']);
		expect(await editor.crumbs()).toEqual(['Home', 'a', 'b']);
	});

	it('zooms out one level and back to the whole note', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		expect(await editor.crumbs()).toEqual(['Home', 'a', 'b', 'c']);
		await editor.runCommand('zoom-out');
		expect(await editor.crumbs()).toEqual(['Home', 'a', 'b']);
		await editor.runCommand('zoom-reset');
		expect(await editor.crumbs()).toEqual([]);
		expect(await editor.visibleLines()).toEqual(NOTE.split('\n'));
	});

	it('zooms out when a breadcrumb is clicked', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.clickCrumb('a');
		expect(await editor.crumbs()).toEqual(['Home', 'a']);
		await editor.clickCrumb('Home');
		expect(await editor.crumbs()).toEqual([]);
	});

	it('edits inside the zoom and keeps the note intact after zooming out', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await editor.type({ line: 2, ch: 4 }, 'X');
		expect(await editor.crumbs()).toEqual(['Home', 'a', 'bX']);
		await editor.runCommand('zoom-reset');
		expect(await editor.text()).toBe('intro\n- a\n\t- bX\n\t\t- c\n\t- d\n- e');
	});

	it('blocks typing in the hidden part of the note', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await editor.type({ line: 0, ch: 0 }, 'X');
		await editor.type({ line: 5, ch: 0 }, 'X');
		expect(await editor.text()).toBe(NOTE);
	});

	it('steps through the zoom history', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		expect(await editor.crumbs()).toEqual(['Home', 'a', 'b', 'c']);
		await editor.runCommand('zoom-history-back');
		expect(await editor.crumbs()).toEqual(['Home', 'a']);
		await editor.runCommand('zoom-history-forward');
		expect(await editor.crumbs()).toEqual(['Home', 'a', 'b', 'c']);
	});

	it('explains a zoom request outside a list item', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(0, 2);
		await editor.runCommand('zoom-in');
		expect(await editor.notices()).toContain('Place the cursor in a list item to zoom.');
		expect(await editor.crumbs()).toEqual([]);
	});

	it('offers zoom out only while zoomed', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		expect(await editor.isAvailable('zoom-out')).toBe(false);
		await editor.runCommand('zoom-in');
		expect(await editor.isAvailable('zoom-out')).toBe(true);
	});

	it('refuses a tree command that would change items outside the zoom', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		await editor.runCommand('move-item-down');
		expect(await editor.text()).toBe(NOTE);
		expect(await editor.notices()).toContain(
			'That would change items outside the zoomed item. Zoom out first.',
		);
	});

	it('shows the whole note and explains when the zoomed item stops being an item', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await editor.replace(2, 0, 3, '');
		expect(await editor.crumbs()).toEqual([]);
		expect(await editor.notices()).toContain('Zoomed item was removed. Showing the full note.');
		expect(await editor.visibleLines()).toHaveLength(NOTE.split('\n').length);
	});
});
