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

const NOTE = '- a\n\t- b\n\t\t- c\n\t\t\t- d\n\t\t- e\n- f';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('clean zoom in real Obsidian', () => {
	it('moves the zoomed item to the left edge of the note', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await wait(300);
		const topLevel = await editor.bulletPoint(0);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const zoomed = await editor.bulletPoint(2);
		expect(Math.abs(zoomed.x - topLevel.x)).toBeLessThan(2);
	});

	it('keeps the children of the zoomed item one level in', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await wait(300);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const item = await editor.bulletPoint(2);
		const child = await editor.bulletPoint(3);
		expect(child.x).toBeGreaterThan(item.x + 10);
	});

	it('marks the zoomed lines and gives them the number of hidden levels', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const levels = await app.evaluate<string[]>(
			'Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-line.flow-zoom-line")).map((el) => el.style.getPropertyValue("--flow-zoom-levels").trim())',
		);
		expect(levels).toEqual(['2', '2']);
	});

	it('hides the indentation guides of the levels that are not shown', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await wait(300);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const clipped = await app.evaluate<boolean>(
			`(() => { const line = activeDocument.querySelector(".workspace-leaf.mod-active .cm-line.flow-zoom-line"); const style = getComputedStyle(line); return style.clipPath !== "none" && parseFloat(style.insetInlineStart) < 0; })()`,
		);
		expect(clipped).toBe(true);
	});

	it('shifts nothing when the zoomed item is at the top level', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(0, 3);
		await editor.runCommand('zoom-in');
		await wait(300);
		const marked = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-line.flow-zoom-line").length',
		);
		expect(marked).toBe(0);
	});

	it('puts everything back when the whole note is shown again', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await editor.runCommand('zoom-reset');
		await wait(300);
		const marked = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-line.flow-zoom-line").length',
		);
		expect(marked).toBe(0);
	});

	it('still zooms to a deeper item by clicking its bullet', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		await wait(300);
		const bullet = await editor.bulletPoint(3);
		await app.click(bullet.x, bullet.y, false);
		await wait(300);
		expect(await editor.crumbs()).toEqual(['a', 'b', 'c', 'd']);
	});

	it('keeps the indentation when the setting is off', async () => {
		await app.evaluate(
			'(app.plugins.plugins["flow-outliner"].settings.cleanZoom = false, app.workspace.updateOptions(), true)',
		);
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const marked = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-line.flow-zoom-line").length',
		);
		expect(marked).toBe(0);
		await app.evaluate(
			'(app.plugins.plugins["flow-outliner"].settings.cleanZoom = true, app.workspace.updateOptions(), true)',
		);
	});
});
