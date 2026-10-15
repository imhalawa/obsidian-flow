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

/** Opens a note with the caret placed and the editor focused. */
async function openWithCaret(text: string, line: number, ch: number): Promise<NoteEditor> {
	const editor = await NoteEditor.open(app, text);
	await editor.focus();
	await editor.caret(line, ch);
	return editor;
}

/** Changes a setting of the plugin for the next key press. */
async function setSetting(key: string, value: boolean): Promise<void> {
	await app.evaluate(
		`(app.plugins.plugins["flow-outliner"].settings[${JSON.stringify(key)}] = ${String(value)}, true)`,
	);
}

describe('Enter in real Obsidian', () => {
	it('ends the list at an empty top level item', async () => {
		const editor = await openWithCaret('- a\n- ', 1, 2);
		await app.pressKey('enter', false, false);
		expect(await editor.text()).toBe('- a\n');
	});

	it('outdents an empty nested item', async () => {
		const editor = await openWithCaret('- a\n\t- ', 1, 3);
		await app.pressKey('enter', false, false);
		expect(await editor.text()).toBe('- a\n- ');
		expect(await editor.selections()).toEqual([
			{ anchor: { line: 1, ch: 2 }, head: { line: 1, ch: 2 } },
		]);
	});

	it('leaves Enter in an item with text to Obsidian', async () => {
		const editor = await openWithCaret('- a', 0, 3);
		await app.pressKey('enter', false, false);
		expect(await editor.text()).toBe('- a\n- ');
	});
});

describe('Backspace in real Obsidian', () => {
	it('merges an item into the one above', async () => {
		const editor = await openWithCaret('- one\n- two', 1, 2);
		await app.pressKey('backspace', false, false);
		expect(await editor.text()).toBe('- onetwo');
		expect((await editor.selections())[0]?.head).toEqual({ line: 0, ch: 5 });
	});

	it('deletes one character inside the text as usual', async () => {
		const editor = await openWithCaret('- one\n- two', 1, 4);
		await app.pressKey('backspace', false, false);
		expect(await editor.text()).toBe('- one\n- to');
	});

	it('leaves Backspace to Obsidian when the setting is off', async () => {
		await setSetting('backspaceMergesItem', false);
		const editor = await openWithCaret('- one\n- two', 1, 2);
		await app.pressKey('backspace', false, false);
		expect(await editor.text()).not.toBe('- onetwo');
		await setSetting('backspaceMergesItem', true);
	});
});

describe('Home and select all in real Obsidian', () => {
	it('moves to the start of the item text', async () => {
		const editor = await openWithCaret('- abc', 0, 5);
		await app.pressKey('home', false, false);
		expect((await editor.selections())[0]?.head).toEqual({ line: 0, ch: 2 });
	});

	it('extends the selection to the start of the item text with Shift', async () => {
		const editor = await openWithCaret('- abc', 0, 5);
		await app.pressKey('home', true, false);
		expect((await editor.selections())[0]).toEqual({
			anchor: { line: 0, ch: 5 },
			head: { line: 0, ch: 2 },
		});
	});

	it('selects the item text first and the whole note next', async () => {
		const editor = await openWithCaret('- abc\n- def', 0, 3);
		await app.pressKey('a', false, true);
		expect((await editor.selections())[0]).toEqual({
			anchor: { line: 0, ch: 2 },
			head: { line: 0, ch: 5 },
		});
		await app.pressKey('a', false, true);
		expect((await editor.selections())[0]).toEqual({
			anchor: { line: 0, ch: 0 },
			head: { line: 1, ch: 5 },
		});
	});
});

describe('Tab in real Obsidian', () => {
	const NOTE = '- a\n- b\n\t- c';

	it('moves a single line when the setting is off, as Obsidian does', async () => {
		const editor = await openWithCaret(NOTE, 1, 3);
		await app.pressKey('tab', false, false);
		expect(await editor.text()).toBe('- a\n\t- b\n\t- c');
	});

	it('moves the item with its children when the setting is on', async () => {
		await setSetting('tabIndentsItem', true);
		const editor = await openWithCaret(NOTE, 1, 3);
		await app.pressKey('tab', false, false);
		expect(await editor.text()).toBe('- a\n\t- b\n\t\t- c');
		await app.pressKey('tab', true, false);
		expect(await editor.text()).toBe(NOTE);
		await setSetting('tabIndentsItem', false);
	});
});
