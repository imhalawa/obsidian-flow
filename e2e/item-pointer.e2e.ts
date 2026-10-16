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

const NOTE = '- a\n\t- b\n\t\t- c\n- d';

const setting = (name: string, value: boolean) =>
	app.evaluate(`(app.plugins.plugins["flow-outliner"].settings.${name} = ${value}, true)`);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('bullets and thread lines in real Obsidian', () => {
	it('zooms into an item when its bullet is clicked', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(1);
		await app.click(bullet.x, bullet.y, false);
		expect(await editor.waitForCrumbs(3000)).toEqual(['a', 'b']);
	});

	it('zooms into an item when its bullet is tapped with a finger', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(1);
		await app.tap(bullet.x, bullet.y);
		expect(await editor.waitForCrumbs(3000)).toEqual(['a', 'b']);
	});

	it('does not zoom into the item of an earlier tap when the next tap lands elsewhere', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const first = await editor.bulletPoint(2);
		await app.tap(first.x, first.y);
		await editor.waitForCrumbs(3000);
		await editor.runCommand('zoom-reset');
		const second = await editor.bulletPoint(3);
		await app.tap(second.x + 200, second.y);
		await wait(300);
		expect(await editor.crumbs()).toEqual([]);
	});

	it('keeps the fold arrow of Obsidian working next to the bullet', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(1);
		await app.click(bullet.x - 21, bullet.y, false);
		await wait(300);
		expect(await editor.folds()).toHaveLength(1);
		expect(await editor.crumbs()).toEqual([]);
	});

	it('does not zoom when the text of an item is clicked', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(3);
		await app.click(bullet.x + 60, bullet.y, false);
		await wait(300);
		expect(await editor.crumbs()).toEqual([]);
	});

	it('does not zoom on a bullet click when the setting is off', async () => {
		await setting('clickBulletToZoom', false);
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(3);
		await app.click(bullet.x, bullet.y, false);
		await wait(300);
		expect(await editor.crumbs()).toEqual([]);
		await setting('clickBulletToZoom', true);
	});

	it('shows the clickable cursor over a bullet and not over text', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(3);
		await app.movePointer(bullet.x, bullet.y);
		expect(await editor.pointerIsOverControl()).toBe(true);
		await app.movePointer(bullet.x + 80, bullet.y);
		expect(await editor.pointerIsOverControl()).toBe(false);
	});

	it('folds a branch when its thread line is clicked', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const parent = await editor.bulletPoint(0);
		await app.click(parent.x, await editor.linePoint(1), false);
		expect(await editor.folds()).toHaveLength(1);
	});

	it('folds every descendant when a thread line is clicked with Alt', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const parent = await editor.bulletPoint(0);
		await app.click(parent.x, await editor.linePoint(1), true);
		expect(await editor.folds()).toHaveLength(2);
	});

	it('does not fold on a thread line click when the setting is off', async () => {
		await setting('clickThreadLineToFold', false);
		const editor = await NoteEditor.open(app, NOTE);
		const parent = await editor.bulletPoint(0);
		await app.click(parent.x, await editor.linePoint(1), false);
		expect(await editor.folds()).toHaveLength(0);
		await setting('clickThreadLineToFold', true);
	});

	it('offers the item actions when a bullet is right-clicked', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(0);
		await app.rightClick(bullet.x, bullet.y);
		await wait(300);
		expect(await editor.menuEntries()).toEqual([
			'Zoom into item',
			'Fold item',
			'Copy link to item',
		]);
	});

	it('folds the item from the menu and then offers to unfold it', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(0);
		await app.rightClick(bullet.x, bullet.y);
		await wait(300);
		await editor.chooseMenuEntry('Fold item');
		expect(await editor.folds()).toHaveLength(1);
		await app.rightClick(bullet.x, bullet.y);
		await wait(300);
		expect(await editor.menuEntries()).toContain('Unfold item');
	});

	it('copies a link to the item from the menu and writes its id', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(3);
		await app.rightClick(bullet.x, bullet.y);
		await wait(300);
		await editor.chooseMenuEntry('Copy link to item');
		expect(await editor.text()).toMatch(/- d \^[a-z0-9]{6}$/);
	});
});
