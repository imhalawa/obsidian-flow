import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

const POINTER = { x: 640, y: 450 };
const NOTE = 'intro\n- a\n\t- b\n\t\t- c\n\t- d\n- e';

beforeAll(async () => {
	app = await ObsidianApp.start();
});

afterAll(async () => {
	await app.stop();
});

/** Switches the "Use mouse back and forward for zoom" setting. */
async function useMouseHistory(enabled: boolean): Promise<void> {
	await app.evaluate(
		`(app.plugins.plugins["flow-outliner"].settings.useMouseHistory = ${String(enabled)}, true)`,
	);
}

/** Zooms into the first item and then into its child, so the zoom history has two levels. */
async function zoomTwice(editor: NoteEditor): Promise<void> {
	await editor.caret(1, 3);
	await editor.runCommand('zoom-in');
	await editor.caret(2, 4);
	await editor.runCommand('zoom-in');
}

describe('mouse back and forward in real Obsidian', () => {
	it('steps back through zoom levels with the back button', async () => {
		await useMouseHistory(true);
		const editor = await NoteEditor.open(app, NOTE);
		await zoomTwice(editor);
		expect(await editor.crumbs()).toEqual(['a', 'b']);
		app.pressSideButton(POINTER.x, POINTER.y, 'back');
		expect(await editor.crumbs()).toEqual(['a']);
	});

	it('steps forward through zoom levels with the forward button', async () => {
		await useMouseHistory(true);
		const editor = await NoteEditor.open(app, NOTE);
		await zoomTwice(editor);
		app.pressSideButton(POINTER.x, POINTER.y, 'back');
		app.pressSideButton(POINTER.x, POINTER.y, 'forward');
		expect(await editor.crumbs()).toEqual(['a', 'b']);
	});

	it('steps back through zoom levels reached by clicking bullets', async () => {
		await useMouseHistory(true);
		const editor = await NoteEditor.open(app, NOTE);
		const parent = await editor.bulletPoint(1);
		await app.click(parent.x, parent.y, false);
		const child = await editor.bulletPoint(2);
		await app.click(child.x, child.y, false);
		expect(await editor.crumbs()).toEqual(['a', 'b']);
		app.pressSideButton(POINTER.x, POINTER.y, 'back');
		expect(await editor.crumbs()).toEqual(['a']);
	});

	it('steps back to the level that was left by clicking a breadcrumb', async () => {
		await useMouseHistory(true);
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.clickCrumb('a');
		expect(await editor.crumbs()).toEqual(['a']);
		app.pressSideButton(POINTER.x, POINTER.y, 'back');
		expect(await editor.crumbs()).toEqual(['a', 'b', 'c']);
	});

	it('keeps the note open while it steps through zoom levels', async () => {
		await useMouseHistory(true);
		const editor = await NoteEditor.open(app, NOTE);
		const path = await editor.path();
		await zoomTwice(editor);
		app.pressSideButton(POINTER.x, POINTER.y, 'back');
		expect(await editor.path()).toBe(path);
	});

	it('goes to the previous note when the zoom history cannot move', async () => {
		await useMouseHistory(true);
		const first = await NoteEditor.open(app, NOTE);
		const firstPath = await first.path();
		const second = await NoteEditor.open(app, NOTE);
		expect(await second.path()).not.toBe(firstPath);
		app.pressSideButton(POINTER.x, POINTER.y, 'back');
		expect(await second.path()).toBe(firstPath);
	});

	it('goes to the previous note when the setting is off', async () => {
		await useMouseHistory(false);
		const first = await NoteEditor.open(app, NOTE);
		const firstPath = await first.path();
		const second = await NoteEditor.open(app, NOTE);
		await zoomTwice(second);
		app.pressSideButton(POINTER.x, POINTER.y, 'back');
		expect(await second.path()).toBe(firstPath);
		await useMouseHistory(true);
	});

	it('steps through zoom levels in a pop-out window', async () => {
		await useMouseHistory(true);
		await NoteEditor.open(app, NOTE);
		const popout = await app.evaluate<{ x: number; y: number }>(
			`(async () => {
				const leaf = app.workspace.openPopoutLeaf();
				await leaf.openFile(app.workspace.getActiveFile());
				app.workspace.setActiveLeaf(leaf, { focus: true });
				window.__popoutLeaf = leaf;
				const win = leaf.view.containerEl.ownerDocument.defaultView;
				return { x: win.screenX + win.outerWidth / 2, y: win.screenY + win.outerHeight / 2 };
			})()`,
		);
		const popoutEditor = NoteEditor.attach(app);
		await popoutEditor.caret(1, 3);
		await popoutEditor.runCommand('zoom-in');
		await popoutEditor.caret(2, 4);
		await popoutEditor.runCommand('zoom-in');
		const crumbs = () =>
			app.evaluate<string[]>(
				'Array.from(window.__popoutLeaf.view.containerEl.querySelectorAll(".flow-crumbs__crumb:not(.is-hidden)")).map((el) => el.textContent)',
			);
		expect(await crumbs()).toEqual(['a', 'b']);
		app.pressSideButton(popout.x, popout.y, 'back');
		expect(await crumbs()).toEqual(['a']);
	});
});
