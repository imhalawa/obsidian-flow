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

const NOTE = '- Alpha\n\t- Beta\n\t\t- Gamma\n- Delta';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Selection {
	anchor: number;
	head: number;
	text: string;
}

/** Reads the main selection of the open note: both ends and the text it covers. */
const readSelection = () =>
	app.evaluate<Selection>(
		`(() => { const cm = app.workspace.activeEditor.editor.cm; const main = cm.state.selection.main; return { anchor: main.anchor, head: main.head, text: cm.state.sliceDoc(main.from, main.to) }; })()`,
	);

/** Selects a range of the open note the way a drag does: one selection transaction. */
const select = (anchor: number, head: number) =>
	app.evaluate(
		`(() => { const cm = app.workspace.activeEditor.editor.cm; cm.focus(); cm.dispatch({ selection: { anchor: ${anchor}, head: ${head} } }); return true; })()`,
	);

const setBulletSetting = (value: boolean) =>
	app.evaluate(
		`(app.plugins.plugins["roamer"].settings.keepBulletOutOfSelection = ${value}, app.workspace.updateOptions(), true)`,
	);

describe('bullets outside the text selection in real Obsidian', () => {
	it('moves a cursor placed in the marker to the start of the text', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await select(0, 0);
		await wait(150);
		expect((await readSelection()).head).toBe(2);
		await editor.caret(1, 1);
		await wait(150);
		expect((await readSelection()).head).toBe(NOTE.indexOf('Beta'));
	});

	it('selects only the text when a selection starts in the marker', async () => {
		await NoteEditor.open(app, NOTE);
		await select(0, 7);
		await wait(150);
		const selection = await readSelection();
		expect(selection.text).toBe('Alpha');
	});

	it('ends a selection at the start of the text when it reaches into a marker', async () => {
		await NoteEditor.open(app, NOTE);
		await select(NOTE.indexOf('Beta') + 4, NOTE.indexOf('- Delta') + 1);
		await wait(150);
		expect((await readSelection()).head).toBe(NOTE.indexOf('Delta'));
	});

	it('keeps the markers of the lines in the middle of a selection', async () => {
		await NoteEditor.open(app, NOTE);
		await select(NOTE.indexOf('Alpha'), NOTE.indexOf('Gamma') + 5);
		await wait(150);
		expect((await readSelection()).text).toBe('Alpha\n\t- Beta\n\t\t- Gamma');
	});

	it('selects only the text when a mouse drag runs into the bullet', async () => {
		await NoteEditor.open(app, NOTE);
		const points = await app.evaluate<{ x: number; y: number }[]>(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const end = cm.coordsAtPos(7); const start = cm.coordsAtPos(0); const y = (end.top + end.bottom) / 2; return [{ x: end.left - 2, y }, { x: end.left - 40, y }, { x: start.left + 2, y }]; })()`,
		);
		await app.drag(points);
		await wait(300);
		const selection = await readSelection();
		expect(selection.text).toBe('Alpha');
	});

	it('ends a mouse drag across lines at the start of the text of the last item', async () => {
		await NoteEditor.open(app, NOTE);
		const points = await app.evaluate<{ x: number; y: number }[]>(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const from = cm.coordsAtPos(7); const lineStart = cm.state.doc.line(2).from; const to = cm.coordsAtPos(lineStart); return [{ x: from.left - 2, y: (from.top + from.bottom) / 2 }, { x: to.left + 30, y: (to.top + to.bottom) / 2 }, { x: to.left + 2, y: (to.top + to.bottom) / 2 }]; })()`,
		);
		await app.drag(points);
		await wait(300);
		const selection = await readSelection();
		expect(selection.head).toBe(NOTE.indexOf('Beta'));
	});

	it('moves the left arrow at the start of the text to the end of the line above', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await app.pressKey('left', false, false);
		await wait(150);
		expect((await readSelection()).head).toBe(NOTE.indexOf('\n'));
	});

	it('does nothing on Backspace at the start of the text of an item with children', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await app.pressKey('backspace', false, false);
		await wait(150);
		expect(await editor.text()).toBe(NOTE);
		expect((await readSelection()).head).toBe(NOTE.indexOf('Beta'));
	});

	it('leaves the marker where it is when the setting is off', async () => {
		await setBulletSetting(false);
		await NoteEditor.open(app, NOTE);
		await select(0, 7);
		await wait(150);
		expect((await readSelection()).text).toBe('- Alpha');
		await setBulletSetting(true);
	});
});
