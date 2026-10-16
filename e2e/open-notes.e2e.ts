import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;
let opened: NoteEditor;
let blockStart: number;

const NOTE = ['# One', '## Two', '- a', '- b', '- c'].join('\n');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
	app = await ObsidianApp.startWithoutPlugin();
	opened = await NoteEditor.open(app, NOTE);
	await wait(500);
	blockStart = app.consoleErrors().length;
	await app.enablePlugin();
	await wait(1000);
});

afterAll(async () => {
	await app.stop();
});

const errorsSinceEnabling = () => app.consoleErrors().slice(blockStart);

describe('a note that was open before the plugin was enabled', () => {
	it('logs no error while the plugin is enabled', () => {
		expect(errorsSinceEnabling()).toEqual([]);
	});

	it('still accepts typed text', async () => {
		await opened.focus();
		await opened.caret(4, 3);
		await app.typeText('x');
		expect(await opened.text()).toBe(['# One', '## Two', '- a', '- b', '- cx'].join('\n'));
	});

	it('continues the list on Enter', async () => {
		await app.pressKey('enter', false, false);
		await app.typeText('y');
		expect(await opened.text()).toBe(
			['# One', '## Two', '- a', '- b', '- cx', '- y'].join('\n'),
		);
	});

	it('zooms into a heading', async () => {
		await opened.caret(1, 3);
		expect(await opened.runCommand('zoom-in')).toBe(true);
		expect(await opened.crumbs()).toEqual(['One', 'Two']);
	});

	it('shows the whole note again', async () => {
		await opened.runCommand('zoom-reset');
		expect(await opened.crumbs()).toEqual([]);
	});

	it('accepts a pasted block of bullets under a heading and then more typing', async () => {
		await opened.caret(1, 6);
		await app.pressKey('enter', false, false);
		await opened.paste('- p1\n- p2\n- p3');
		await app.typeText('z');
		expect((await opened.text()).split('\n').slice(0, 5)).toEqual([
			'# One',
			'## Two',
			'- p1',
			'- p2',
			'- p3z',
		]);
	});

	it('works in source mode', async () => {
		await opened.useSourceMode();
		await opened.caret(0, 5);
		await app.typeText('!');
		expect((await opened.text()).split('\n')[0]).toBe('# One!');
	});

	it('logs no error after all of that', () => {
		expect(errorsSinceEnabling()).toEqual([]);
	});

	it('logs no error and keeps accepting text when the plugin is disabled again', async () => {
		await app.disablePlugin();
		await wait(500);
		await opened.focus();
		await app.typeText('?');
		expect((await opened.text()).split('\n')[0]).toBe('# One!?');
		expect(errorsSinceEnabling()).toEqual([]);
	});
});
