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
	'# How do we plan the garden this spring?',
	'- Choosing the beds (Draft notes)',
	'\t- Measuring the sunny corners',
	'\t\t- Keep the watering schedule up to date in a clear and tidy way',
	'\t\t\t- Consider this layout',
	'\t\t\t\t- Beds',
	'\t\t\t\t\t- Which seeds did you sow this week?',
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
		`Gardens/Spring/Allotments/Spring Garden Planning Process ${noteCounter}.md`,
		DEEP_PATH,
	);
	await editor.caret(6, 12);
	await editor.runCommand('zoom-in');
	await wait(600);
	return editor;
}

describe('a long zoom path in a real window', () => {
	it.each([1950, 1600])(
		'cuts only the crumbs longer than the maximum width in a window %i px wide',
		async (width) => {
			const editor = await zoomedAt(width);
			expect(await editor.clippedPanelTexts()).toEqual([
				'Keep the watering schedule up to date in a clear and tidy way',
			]);
		},
	);

	it('shows every level in a window 1950 px wide', async () => {
		const editor = await zoomedAt(1950);
		expect(await editor.crumbs()).toHaveLength(7);
	});

	it.each([1600, 1200])(
		'keeps the first level and the current item with a … crumb between in a window %i px wide',
		async (width) => {
			const editor = await zoomedAt(width);
			const crumbs = await editor.crumbs();
			expect(crumbs[0]).toBe('How do we plan the garden this spring?');
			expect(crumbs[1]).toBe('…');
			expect(crumbs[crumbs.length - 1]).toBe('Which seeds did you sow this week?');
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
