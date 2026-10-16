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

const setSuggester = (value: boolean) =>
	app.evaluate(`(app.plugins.plugins["flow-outliner"].settings.itemSuggester = ${value}, true)`);

const waitForText = async (editor: NoteEditor, pattern: RegExp): Promise<string> => {
	for (let attempt = 0; attempt < 60; attempt += 1) {
		const text = await editor.text();
		if (pattern.test(text)) return text;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	return editor.text();
};

describe('item suggester in real Obsidian', () => {
	it('links to an item of another note and writes its id there', async () => {
		const other = await NoteEditor.open(app, '- apple pie\n- banana');
		await other.waitUntilIndexed('note-1.md');
		const editor = await NoteEditor.open(app, '- see ');
		await editor.typeKeys('((apple');
		expect(await editor.suggestions()).toContain('apple pie');
		await editor.chooseSuggestion('apple pie');
		const text = await waitForText(editor, /^- see \[\[note-1#\^[a-z0-9]{6}\]\]$/);
		expect(text).toMatch(/^- see \[\[note-1#\^[a-z0-9]{6}\]\]$/);
		const id = /\^([a-z0-9]{6})/.exec(text)?.[1];
		expect(await editor.readNote('note-1.md')).toBe(`- apple pie ^${id}\n- banana`);
	});

	it('links to an item of the same note and removes the closing parens that auto pairing added', async () => {
		const editor = await NoteEditor.open(app, '- apple\n- see ');
		await editor.waitUntilIndexed('note-3.md');
		await editor.typeKeys('((app');
		await editor.suggestions();
		await editor.chooseSuggestion('apple');
		const text = await waitForText(
			editor,
			/^- apple \^[a-z0-9]{6}\n- see \[\[#\^[a-z0-9]{6}\]\]$/,
		);
		expect(text).toMatch(/^- apple \^[a-z0-9]{6}\n- see \[\[#\^[a-z0-9]{6}\]\]$/);
		expect(text).not.toContain('))');
	});

	it('shows nothing when the suggester is switched off', async () => {
		await setSuggester(false);
		const editor = await NoteEditor.open(app, '- apple\n- see ');
		await editor.waitUntilIndexed('note-4.md');
		await editor.typeKeys('((app');
		await new Promise((resolve) => setTimeout(resolve, 800));
		expect(
			await app.evaluate<number>(
				'activeDocument.querySelectorAll(".flow-item-suggest-text").length',
			),
		).toBe(0);
		await setSuggester(true);
	});
});
