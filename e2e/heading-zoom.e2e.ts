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

const NOTE = [
	'# Launch plan',
	'intro text',
	'## Roadmap',
	'- Ship 1.0',
	'\t- Run the checks',
	'- Ship 1.1',
	'## Risks',
	'- Late review',
	'# Retro',
	'- Went well',
].join('\n');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('heading zoom in real Obsidian', () => {
	it('zooms into a heading and shows its section', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		expect(await editor.runCommand('zoom-in')).toBe(true);
		expect(await editor.visibleLines()).toEqual([
			'## Roadmap',
			'- Ship 1.0',
			'\t- Run the checks',
			'- Ship 1.1',
		]);
		expect(await editor.crumbs()).toEqual(['Launch plan', 'Roadmap']);
	});

	it('includes the nested headings of a top heading', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(0, 3);
		await editor.runCommand('zoom-in');
		expect(await editor.visibleLines()).toHaveLength(8);
		expect(await editor.crumbs()).toEqual(['Launch plan']);
	});

	it('shows the headings above a zoomed bullet in its path', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(4, 5);
		await editor.runCommand('zoom-in');
		expect(await editor.crumbs()).toEqual([
			'Launch plan',
			'Roadmap',
			'Ship 1.0',
			'Run the checks',
		]);
	});

	it('zooms out from a top bullet to its heading, then to the parent heading, then to the note', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.runCommand('zoom-out');
		expect(await editor.crumbs()).toEqual(['Launch plan', 'Roadmap']);
		await editor.runCommand('zoom-out');
		expect(await editor.crumbs()).toEqual(['Launch plan']);
		await editor.runCommand('zoom-out');
		expect(await editor.crumbs()).toEqual([]);
	});

	it('zooms to a heading level when its crumb is clicked', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(4, 5);
		await editor.runCommand('zoom-in');
		await editor.clickCrumb('Roadmap');
		expect(await editor.crumbs()).toEqual(['Launch plan', 'Roadmap']);
	});

	it('zooms into the heading section when the cursor is in its text', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		expect(await editor.crumbs()).toEqual(['Launch plan']);
	});

	it('does not zoom a line outside any heading or list', async () => {
		const editor = await NoteEditor.open(app, 'plain text\n# a\n- x');
		await editor.caret(0, 2);
		await editor.runCommand('zoom-in');
		expect(await editor.crumbs()).toEqual([]);
		expect(await editor.notices()).toContain(
			'Place the cursor in a list item or a heading to zoom.',
		);
	});

	it('keeps editing inside a heading zoom and blocks the hidden part', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await editor.type({ line: 7, ch: 0 }, 'X');
		await editor.type({ line: 3, ch: 0 }, 'X');
		expect((await editor.text()).split('\n')[3]).toBe('X- Ship 1.0');
		expect((await editor.text()).split('\n')[7]).toBe('- Late review');
	});

	it('remembers a heading zoom when the note is opened again', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await wait(300);
		await editor.reopen();
		expect(await editor.waitForCrumbs(3000)).toEqual(['Launch plan', 'Roadmap']);
	});
});
