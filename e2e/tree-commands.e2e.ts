import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lezerShape } from '../tests/support/lezer-shape';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
});

afterAll(async () => {
	await app.stop();
});

const shapeOf = (text: string) => lezerShape(text.split('\n'));

describe('plugin in real Obsidian', () => {
	it('registers its commands', async () => {
		const ids = await app.evaluate<string[]>(
			'Object.keys(app.commands.commands).filter((id) => id.startsWith("roamer:"))',
		);
		expect(ids.sort()).toEqual([
			'roamer:fold-all',
			'roamer:fold-item',
			'roamer:indent-item',
			'roamer:move-item-down',
			'roamer:move-item-up',
			'roamer:outdent-item',
			'roamer:unfold-all',
			'roamer:unfold-item',
			'roamer:zoom-history-back',
			'roamer:zoom-history-forward',
			'roamer:zoom-in',
			'roamer:zoom-out',
			'roamer:zoom-reset',
		]);
	});
});

describe('tree commands', () => {
	it('indents an item and keeps the caret on its text', async () => {
		const editor = await NoteEditor.open(app, '- a\n- bc\n- d');
		await editor.caret(1, 3);
		expect(await editor.runCommand('indent-item')).toBe(true);
		expect(await editor.text()).toBe('- a\n\t- bc\n- d');
		expect(shapeOf(await editor.text())).toEqual(['0:a', '1:bc', '0:d']);
		expect(await editor.selections()).toEqual([
			{ anchor: { line: 1, ch: 4 }, head: { line: 1, ch: 4 } },
		]);
	});

	it('outdents an item', async () => {
		const editor = await NoteEditor.open(app, '- a\n\t- b');
		await editor.caret(1, 2);
		await editor.runCommand('outdent-item');
		expect(await editor.text()).toBe('- a\n- b');
	});

	it('moves an item up and the caret follows it', async () => {
		const editor = await NoteEditor.open(app, '- a\n- b');
		await editor.caret(1, 3);
		await editor.runCommand('move-item-up');
		expect(await editor.text()).toBe('- b\n- a');
		expect(await editor.selections()).toEqual([
			{ anchor: { line: 0, ch: 3 }, head: { line: 0, ch: 3 } },
		]);
	});

	it('moves an item down with its children', async () => {
		const editor = await NoteEditor.open(app, '- a\n\t- x\n- b');
		await editor.caret(0, 0);
		await editor.runCommand('move-item-down');
		expect(await editor.text()).toBe('- b\n- a\n\t- x');
	});

	it('acts on every item of a selection and keeps its direction', async () => {
		const editor = await NoteEditor.open(app, '- p\n- a\n- b');
		await editor.select({ anchor: { line: 2, ch: 3 }, head: { line: 1, ch: 0 } });
		await editor.runCommand('indent-item');
		expect(await editor.text()).toBe('- p\n\t- a\n\t- b');
		expect(await editor.selections()).toEqual([
			{ anchor: { line: 2, ch: 4 }, head: { line: 1, ch: 1 } },
		]);
	});

	it('undoes a multi item change in one step', async () => {
		const editor = await NoteEditor.open(app, '- p\n- a\n- b');
		await editor.select({ anchor: { line: 1, ch: 0 }, head: { line: 2, ch: 3 } });
		await editor.runCommand('indent-item');
		await editor.undo();
		expect(await editor.text()).toBe('- p\n- a\n- b');
	});

	it('keeps ordered items readable as lists after indenting', async () => {
		const editor = await NoteEditor.open(app, '- a\n10. b');
		await editor.caret(1, 1);
		await editor.runCommand('indent-item');
		expect(shapeOf(await editor.text())).toEqual(['0:a', '1:b']);
	});

	it('tells the user why a command did nothing', async () => {
		const editor = await NoteEditor.open(app, '- a\n- b');
		await editor.caret(0, 0);
		await editor.runCommand('move-item-up');
		expect(await editor.text()).toBe('- a\n- b');
		expect(await editor.notices()).toContain('This item is the first one at its level.');
	});

	it('is offered only on a list item', async () => {
		const editor = await NoteEditor.open(app, 'plain text\n\n- item');
		await editor.caret(0, 2);
		expect(await editor.isAvailable('indent-item')).toBe(false);
		await editor.caret(2, 2);
		expect(await editor.isAvailable('indent-item')).toBe(true);
	});

	it.each([
		['tabs', true],
		['spaces', false],
	])('indents with the same unit as Obsidian does for %s', async (_name, useTab) => {
		await app.evaluate(
			`app.vault.setConfig("useTab", ${useTab}); app.workspace.updateOptions();`,
		);
		const native = await NoteEditor.open(app, '- a\n- b');
		await native.caret(1, 0);
		await native.exec('indentMore');
		const nativeText = await native.text();
		const ours = await NoteEditor.open(app, '- a\n- b');
		await ours.caret(1, 0);
		await ours.runCommand('indent-item');
		expect(await ours.text()).toBe(nativeText);
		await app.evaluate('app.vault.setConfig("useTab", true); app.workspace.updateOptions();');
	});

	it('matches the indent already used in the note', async () => {
		const editor = await NoteEditor.open(app, '- a\n   - b\n- c');
		await editor.caret(2, 0);
		await editor.runCommand('indent-item');
		expect(await editor.text()).toBe('- a\n   - b\n   - c');
	});
});
