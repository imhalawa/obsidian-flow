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

const NOTE = 'intro\n- a\n\t- b\n\t\t- c\n\t- d\n- e\n\t- f';

describe('folds in real Obsidian', () => {
	it('folds an item exactly the way Obsidian folds it', async () => {
		const own = await NoteEditor.open(app, NOTE);
		await own.caret(1, 3);
		await own.exec('toggleFold');
		const expected = await own.folds();
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('fold-item');
		expect(await editor.folds()).toEqual(expected);
		expect(await editor.visibleLines()).toEqual(['intro', '- a…', '- e', '\t- f']);
	});

	it('unfolds an item that Obsidian folded', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.exec('toggleFold');
		await editor.runCommand('unfold-item');
		expect(await editor.folds()).toEqual([]);
		expect(await editor.visibleLines()).toEqual(NOTE.split('\n'));
	});

	it('folds and unfolds every item', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(0, 0);
		await editor.runCommand('fold-all');
		expect((await editor.folds()).length).toBe(3);
		expect(await editor.visibleLines()).toEqual(['intro', '- a…', '- e…']);
		await editor.runCommand('unfold-all');
		expect(await editor.folds()).toEqual([]);
	});

	it('keeps folds when the note is closed and opened again', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('fold-item');
		const folded = await editor.folds();
		await editor.reopen();
		await new Promise((resolve) => setTimeout(resolve, 800));
		expect(await editor.folds()).toEqual(folded);
	});

	it('animates the lines that an unfold shows and stops marking them afterwards', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('fold-item');
		await editor.runCommand('unfold-item');
		expect(await editor.revealedLines()).toEqual([
			{ text: '\t- b', animation: 'flow-line-reveal' },
			{ text: '\t\t- c', animation: 'flow-line-reveal' },
			{ text: '\t- d', animation: 'flow-line-reveal' },
		]);
		await new Promise((resolve) => setTimeout(resolve, 900));
		expect(await editor.revealedLines()).toEqual([]);
	});

	it('does not animate an unfold when the user prefers reduced motion', async () => {
		await app.emulateReducedMotion(true);
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('fold-item');
		await editor.runCommand('unfold-item');
		const animations = (await editor.revealedLines()).map((line) => line.animation);
		await app.emulateReducedMotion(false);
		expect(animations).toEqual(['none', 'none', 'none']);
	});

	it('does not mark any line when an item is folded', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('fold-item');
		expect(await editor.revealedLines()).toEqual([]);
	});

	it('explains that a leaf has no children to fold', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(4, 4);
		await editor.runCommand('fold-item');
		expect(await editor.notices()).toContain('This item has no children to fold.');
	});

	it('unfolds, and does not zoom, when the right edge of the fold dots is clicked', async () => {
		const editor = await NoteEditor.open(app, '- a\n\t- b\n\t\t- c\n\t\t- d\n\t- e');
		await editor.caret(1, 4);
		await editor.runCommand('fold-item');
		await new Promise((resolve) => setTimeout(resolve, 300));
		const edge = await app.evaluate<{ x: number; y: number }>(
			`(() => { const r = activeDocument.querySelector('.workspace-leaf.mod-active .cm-foldPlaceholder').getBoundingClientRect(); return { x: r.right - 1, y: (r.top + r.bottom) / 2 }; })()`,
		);
		await app.click(edge.x, edge.y, false);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(await editor.folds()).toEqual([]);
		expect(await editor.crumbs()).toEqual([]);
	});

	it('does not mark the last zoomed item as folded when a fold is hidden below the zoom', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(5, 3);
		await editor.runCommand('fold-item');
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		await new Promise((resolve) => setTimeout(resolve, 300));
		const collapsed = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-fold-indicator.is-collapsed").length',
		);
		expect(collapsed).toBe(0);
	});

	it('keeps folds made while zoomed after zooming out', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await editor.runCommand('fold-item');
		expect(await editor.visibleLines()).toEqual(['\t- b…']);
		await editor.runCommand('zoom-reset');
		expect(await editor.visibleLines()).toEqual([
			'intro',
			'- a',
			'\t- b…',
			'\t- d',
			'- e',
			'\t- f',
		]);
	});

	it('shows a folded item again as folded when zooming into it', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('fold-item');
		await editor.runCommand('zoom-in');
		expect(await editor.visibleLines()).toEqual(['\t- b…']);
	});

	it('keeps the zoomed item visible when Obsidian folds everything', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.exec('foldAll');
		expect(await editor.visibleLines()).toEqual(['\t\t- c']);
	});

	it('unfolds a parent that hides the item when stepping back into a zoom', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.runCommand('zoom-reset');
		await editor.caret(1, 3);
		await editor.runCommand('fold-item');
		await editor.runCommand('zoom-history-back');
		expect(await editor.visibleLines()).toEqual(['\t\t- c']);
		expect(await editor.folds()).toEqual([]);
	});
});
