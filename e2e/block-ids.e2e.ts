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

const ID = / \^([a-z0-9]{6})/;

const setHide = (value: boolean) =>
	app.evaluate(
		`(app.plugins.plugins["flow-outliner"].settings.hideBlockIds = ${value}, app.workspace.updateOptions(), true)`,
	);

describe('block ids in real Obsidian', () => {
	it('adds an id that Obsidian recognises as a block', async () => {
		const editor = await NoteEditor.open(app, '- a\n- b');
		await editor.caret(1, 3);
		await editor.runCommand('copy-item-link');
		const text = await editor.text();
		const id = ID.exec(text)?.[1];
		expect(text).toMatch(/^- a\n- b \^[a-z0-9]{6}$/);
		expect(await editor.blockIds()).toEqual([id]);
	});

	it('puts the id of a multi line item where Obsidian reads it', async () => {
		const editor = await NoteEditor.open(app, '- a\n  continued\n  - child');
		await editor.caret(0, 3);
		await editor.runCommand('copy-item-link');
		const text = await editor.text();
		expect(text).toMatch(/^- a\n {2}continued \^[a-z0-9]{6}\n {2}- child$/);
		expect((await editor.blockIds()).length).toBe(1);
	});

	it('puts the id of a nested item on its own line', async () => {
		const editor = await NoteEditor.open(app, '- a\n\t- b\n- c');
		await editor.caret(1, 4);
		await editor.runCommand('copy-item-link');
		expect(await editor.text()).toMatch(/^- a\n\t- b \^[a-z0-9]{6}\n- c$/);
	});

	it('keeps an id it finds and does not change the note', async () => {
		const editor = await NoteEditor.open(app, '- a ^keep1');
		await editor.caret(0, 1);
		await editor.runCommand('copy-item-link');
		expect(await editor.text()).toBe('- a ^keep1');
	});

	it('undoes adding an id in one step', async () => {
		const editor = await NoteEditor.open(app, '- a\n- b');
		await editor.caret(0, 3);
		await editor.runCommand('copy-item-link');
		await editor.undo();
		expect(await editor.text()).toBe('- a\n- b');
	});

	it('tells the user to place the cursor in a list item', async () => {
		const editor = await NoteEditor.open(app, 'text\n- a');
		await editor.caret(0, 1);
		await editor.runCommand('copy-item-link');
		expect(await editor.notices()).toContain('Place the cursor in a list item.');
		expect(await editor.text()).toBe('text\n- a');
	});

	it('warns when the id of the item is used more than once', async () => {
		const editor = await NoteEditor.open(app, '- a ^dup1\n- b ^dup1');
		await editor.caret(0, 1);
		await editor.runCommand('copy-item-link');
		expect(await editor.notices()).toContain(
			'This block id is used more than once in the note.',
		);
	});

	it('hides ids away from the cursor and shows the id on the cursor line', async () => {
		const editor = await NoteEditor.open(app, '- a ^one111\n- b ^two222\n- c');
		await editor.caret(2, 1);
		expect(await editor.visibleLines()).toEqual(['- a', '- b', '- c']);
		await editor.caret(1, 1);
		expect(await editor.visibleLines()).toEqual(['- a', '- b ^two222', '- c']);
	});

	it('keeps the ids in the note when they are hidden', async () => {
		const editor = await NoteEditor.open(app, '- a ^one111\n- b');
		await editor.caret(1, 1);
		expect(await editor.text()).toBe('- a ^one111\n- b');
	});

	it('shows every id when hiding is switched off', async () => {
		const editor = await NoteEditor.open(app, '- a ^one111\n- b');
		await editor.caret(1, 1);
		await setHide(false);
		expect(await editor.visibleLines()).toEqual(['- a ^one111', '- b']);
		await setHide(true);
		expect(await editor.visibleLines()).toEqual(['- a', '- b']);
	});
});
