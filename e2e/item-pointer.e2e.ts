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
	app.evaluate(`(app.plugins.plugins["roamer"].settings.${name} = ${value}, true)`);

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

	it('folds and unfolds an item when the left edge of its fold arrow is clicked', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const arrow = await editor.foldArrowBox(1);
		const y = (arrow.top + arrow.bottom) / 2;
		await app.click(arrow.left + 1, y, false);
		await wait(300);
		expect(await editor.folds()).toEqual([{ from: 1, to: 2 }]);
		await app.click(arrow.left + 1, y, false);
		await wait(300);
		expect(await editor.folds()).toEqual([]);
	});

	it('folds the item when the space just left of its fold arrow is clicked', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const arrow = await editor.foldArrowBox(1);
		await app.click(arrow.left - 4, (arrow.top + arrow.bottom) / 2, false);
		await wait(300);
		expect(await editor.folds()).toEqual([{ from: 1, to: 2 }]);
	});

	it('widens the clickable area of the fold arrow with the font size', async () => {
		await app.evaluate(
			'(activeDocument.body.style.setProperty("--font-text-size", "28px"), true)',
		);
		await wait(300);
		const editor = await NoteEditor.open(app, NOTE);
		const arrow = await editor.foldArrowBox(1);
		await app.click(arrow.left - 12, (arrow.top + arrow.bottom) / 2, false);
		await wait(300);
		const folds = await editor.folds();
		await app.evaluate('(activeDocument.body.style.removeProperty("--font-text-size"), true)');
		expect(folds).toEqual([{ from: 1, to: 2 }]);
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

	it('shows the clickable cursor over the fold arrow', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const arrow = await editor.foldArrowBox(1);
		expect(await editor.cursorAt(arrow.left + 1, (arrow.top + arrow.bottom) / 2)).toBe(
			'pointer',
		);
	});

	it('shows the clickable cursor over the bullet of an item that is not being edited', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(1);
		await app.movePointer(bullet.x, bullet.y);
		expect(await editor.cursorAt(bullet.x, bullet.y)).toBe('pointer');
	});

	it('lights up the bullet when the pointer is over its fold arrow', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const arrow = await editor.foldArrowBox(1);
		await app.movePointer(arrow.left + 1, (arrow.top + arrow.bottom) / 2);
		await wait(200);
		expect(await editor.litBulletLines()).toEqual([1]);
	});

	it('keeps the bullet lit from its fold arrow until the pointer is on the bullet', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(1);
		const arrow = await editor.foldArrowBox(1);
		const row = bullet.y;
		const lit: number[][] = [];
		for (const x of [arrow.left + 1, arrow.right, bullet.x - 4, bullet.x]) {
			await app.movePointer(x, row);
			await wait(150);
			lit.push(await editor.litBulletLines());
		}
		expect(lit).toEqual([[1], [1], [1], [1]]);
	});

	it('lights up the bullet of a top level item from the gutter at the left edge of the note', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(3);
		await app.movePointer(bullet.x - 40, bullet.y);
		await wait(200);
		expect(await editor.litBulletLines()).toEqual([3]);
	});

	it('lights up the bullet like Obsidian does when its fold arrow is hovered', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(1);
		await app.movePointer(5, 5);
		await wait(300);
		const resting = await editor.bulletDotColor(1);
		await app.movePointer(bullet.x, bullet.y);
		await wait(300);
		expect(await editor.bulletDotColor(1)).not.toBe(resting);
	});

	it('does not light up a bullet when the pointer is over the text of its row', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(1);
		await app.movePointer(bullet.x + 80, bullet.y);
		await wait(200);
		expect(await editor.litBulletLines()).toEqual([]);
	});

	it('lights up only the bullet of the row under the pointer', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const arrow = await editor.foldArrowBox(1);
		await app.movePointer(arrow.left + 1, (arrow.top + arrow.bottom) / 2);
		await wait(200);
		const next = await editor.bulletPoint(2);
		await app.movePointer(next.x, next.y);
		await wait(200);
		expect(await editor.litBulletLines()).toEqual([2]);
	});

	it('puts the light out when the pointer leaves the editor', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(1);
		await app.movePointer(bullet.x, bullet.y);
		await wait(200);
		await app.movePointer(5, 5);
		await wait(200);
		expect(await editor.litBulletLines()).toEqual([]);
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

	it('highlights the thread line from its parent to its last descendant when the pointer is over it', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const parent = await editor.bulletPoint(0);
		const child = await editor.linePoint(1);
		await app.movePointer(parent.x, child);
		await wait(200);
		const [line, ...others] = await editor.threadHighlights();
		const accent = await app.evaluate<string>(
			'(() => { const probe = activeDocument.body.createDiv(); probe.setCssStyles({ backgroundColor: "var(--interactive-accent)" }); const color = getComputedStyle(probe).backgroundColor; probe.remove(); return color; })()',
		);
		expect(others).toEqual([]);
		expect(line?.background).toBe(accent);
		expect(Math.abs(((line?.left ?? 0) + (line?.right ?? 0)) / 2 - parent.x)).toBeLessThan(1.5);
		expect(line?.top).toBeGreaterThanOrEqual(parent.y - 1);
		expect(line?.bottom).toBeGreaterThan(await editor.linePoint(2));
	});

	it('highlights only the branch of the parent whose thread line is hovered', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const nested = await editor.bulletPoint(1);
		await app.movePointer(nested.x, await editor.linePoint(2));
		await wait(200);
		const [line] = await editor.threadHighlights();
		expect(Math.abs(((line?.left ?? 0) + (line?.right ?? 0)) / 2 - nested.x)).toBeLessThan(1.5);
		expect(line?.bottom).toBeLessThan(await editor.linePoint(3));
	});

	it('stops highlighting when the pointer leaves the thread line', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const parent = await editor.bulletPoint(0);
		await app.movePointer(parent.x, await editor.linePoint(1));
		await wait(200);
		await app.movePointer(parent.x + 200, await editor.linePoint(1));
		await wait(200);
		expect(await editor.threadHighlights()).toEqual([]);
	});

	it('does not highlight a thread line while the fold arrow is hovered', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const arrow = await editor.foldArrowBox(1);
		await app.movePointer(arrow.left + 1, (arrow.top + arrow.bottom) / 2);
		await wait(200);
		expect(await editor.threadHighlights()).toEqual([]);
	});

	it('does not highlight a thread line when clicking thread lines is off', async () => {
		await setting('clickThreadLineToFold', false);
		const editor = await NoteEditor.open(app, NOTE);
		const parent = await editor.bulletPoint(0);
		await app.movePointer(parent.x, await editor.linePoint(1));
		await wait(200);
		expect(await editor.threadHighlights()).toEqual([]);
		await setting('clickThreadLineToFold', true);
	});

	it('offers the item actions when a bullet is right-clicked', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const bullet = await editor.bulletPoint(0);
		await app.rightClick(bullet.x, bullet.y);
		await wait(300);
		expect(await editor.menuEntries()).toEqual(['Zoom into item', 'Fold item']);
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
});
