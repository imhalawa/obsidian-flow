import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
	await app.evaluate('(app.workspace.leftSplit.collapse(), true)');
});

afterAll(async () => {
	await app.stop();
});

const DEEP_PATH = [
	'# Why I cannot land a single interview?',
	'- Tackling the Problem (Scratch pad)',
	'\t- Analyzing the Job Description',
	'\t\t- Keep your work history up to date in a structured manner',
	'\t\t\t- Consider this template',
	'\t\t\t\t- Company',
	'\t\t\t\t\t- How did you help the team to grow?',
].join('\n');

let noteCounter = 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Opens the deep note in nested folders at a window width and zooms to its last item. */
async function zoomedAt(width: number): Promise<NoteEditor> {
	await app.resizeWindow(width, 600);
	await wait(400);
	noteCounter += 1;
	const editor = await NoteEditor.openAt(
		app,
		`Projects/Resume/Experience/Resume and Hiring Process in Tech ${noteCounter}.md`,
		DEEP_PATH,
	);
	await editor.caret(6, 12);
	await editor.runCommand('zoom-in');
	await wait(600);
	return editor;
}

describe('a long zoom path in a real window', () => {
	it.each([1950, 1600])(
		'cuts no folder name or crumb short in a window %i px wide',
		async (width) => {
			const editor = await zoomedAt(width);
			expect(await editor.clippedHeaderTexts()).toEqual([]);
		},
	);

	it.each([1950, 1600, 1200])(
		'keeps the first level and the current item with a … crumb between in a window %i px wide',
		async (width) => {
			const editor = await zoomedAt(width);
			const crumbs = await editor.crumbs();
			expect(crumbs[0]).toBe('Why I cannot land a single interview?');
			expect(crumbs[1]).toBe('…');
			expect(crumbs[crumbs.length - 1]).toBe('How did you help the team to grow?');
		},
	);

	it('lays the path out again when the window is resized', async () => {
		const editor = await zoomedAt(1200);
		await app.resizeWindow(2400, 600);
		await wait(600);
		expect(await editor.crumbs()).toHaveLength(7);
		await app.resizeWindow(1200, 600);
		await wait(600);
		expect((await editor.crumbs())[1]).toBe('…');
	});
});
