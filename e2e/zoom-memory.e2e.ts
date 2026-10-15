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
const STORAGE_KEY = 'flow-outliner-zoom';

const setRemember = (value: boolean) =>
	app.evaluate(`(app.plugins.plugins["flow-outliner"].settings.rememberZoom = ${value}, true)`);

describe('remembered zoom in real Obsidian', () => {
	it('reopens a note at the item it was zoomed into', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await editor.reopen();
		expect(await editor.waitForCrumbs(3000)).toEqual(['Home', 'a', 'b']);
		expect(await editor.visibleLines()).toEqual(['\t- b', '\t\t- c']);
	});

	it('lets the user step back from a restored zoom to the whole note', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await editor.reopen();
		await editor.waitForCrumbs(3000);
		await editor.runCommand('zoom-history-back');
		expect(await editor.crumbs()).toEqual([]);
	});

	it('reopens the whole note after the user zoomed out', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await editor.runCommand('zoom-reset');
		await editor.reopen();
		expect(await editor.waitForCrumbs(500)).toEqual([]);
	});

	it('falls back to the nearest parent when the item changed meanwhile', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.reopenAfterRewriting('intro\n- a\n\t- b\n\t\t- c renamed\n\t- d\n- e');
		expect(await editor.waitForCrumbs(3000)).toEqual(['Home', 'a', 'b']);
	});

	it('does not restore when remembering is switched off', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await setRemember(false);
		await editor.reopen();
		expect(await editor.waitForCrumbs(500)).toEqual([]);
		await setRemember(true);
	});

	it('keeps the zoom when the note is renamed and forgets it when deleted', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		const oldPath = await editor.path();
		await app.evaluate(
			`app.fileManager.renameFile(app.workspace.getActiveFile(), "renamed-" + Date.now() + ".md").then(() => true)`,
		);
		const newPath = await editor.path();
		const keys = await app.evaluate<string[]>(
			`Object.keys(app.loadLocalStorage(${JSON.stringify(STORAGE_KEY)}) ?? {})`,
		);
		expect(keys).toContain(newPath);
		expect(keys).not.toContain(oldPath);
		await app.evaluate(`app.vault.delete(app.workspace.getActiveFile()).then(() => true)`);
		const after = await app.evaluate<string[]>(
			`Object.keys(app.loadLocalStorage(${JSON.stringify(STORAGE_KEY)}) ?? {})`,
		);
		expect(after).not.toContain(newPath);
	});
});
