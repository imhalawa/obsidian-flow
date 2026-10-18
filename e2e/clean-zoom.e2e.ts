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

const NOTE = '- a\n\t- b\n\t\t- c\n\t\t\t- d\n\t\t- e\n- f';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('clean zoom in real Obsidian', () => {
	it('moves the zoomed item to the left edge of the note', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await wait(300);
		const topLevel = await editor.bulletPoint(0);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const zoomed = await editor.bulletPoint(2);
		expect(Math.abs(zoomed.x - topLevel.x)).toBeLessThan(2);
	});

	it('keeps the children of the zoomed item one level in', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await wait(300);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const item = await editor.bulletPoint(2);
		const child = await editor.bulletPoint(3);
		expect(child.x).toBeGreaterThan(item.x + 10);
	});

	it.each([
		['two spaces', '- a\n  - b\n    - c\n      - d', 1],
		['four spaces', '- a\n    - b\n        - c', 1],
		['two spaces, deeper', '- a\n  - b\n    - c\n      - d', 2],
	])('moves an item indented with %s to the left edge', async (_name, note, line) => {
		const editor = await NoteEditor.open(app, note);
		await wait(300);
		const topLevel = await editor.bulletPoint(0);
		await editor.caret(line, 4);
		await editor.runCommand('zoom-in');
		await wait(300);
		const zoomed = await editor.bulletPoint(line);
		expect(Math.abs(zoomed.x - topLevel.x)).toBeLessThan(2);
	});

	it('follows the setting while the note stays zoomed', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const count = () =>
			app.evaluate<number>(
				'activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-line.roamer-zoom-line").length',
			);
		expect(await count()).toBe(2);
		await app.evaluate(
			'(app.plugins.plugins["roamer"].settings.cleanZoom = false, app.workspace.updateOptions(), true)',
		);
		await wait(300);
		expect(await count()).toBe(0);
		await app.evaluate(
			'(app.plugins.plugins["roamer"].settings.cleanZoom = true, app.workspace.updateOptions(), true)',
		);
		await wait(300);
		expect(await count()).toBe(2);
	});

	it('marks the zoomed lines and gives them the shift of the hidden levels', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const shift = await app.evaluate<string>(
			'activeDocument.querySelector(".workspace-leaf.mod-active .cm-editor").style.getPropertyValue("--roamer-zoom-shift")',
		);
		expect(parseFloat(shift)).toBeGreaterThan(30);
	});

	it('hides the indent steps of the levels that are not shown without clipping the line', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await wait(300);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const result = await app.evaluate<{ clip: string; offset: number; hidden: string[] }>(
			`(() => { const line = activeDocument.querySelector(".workspace-leaf.mod-active .cm-line.roamer-zoom-line"); const style = getComputedStyle(line); const hidden = Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .roamer-zoom-hidden-indent")).flatMap((el) => [getComputedStyle(el).visibility, getComputedStyle(el.closest(".cm-indent")).visibility]); return { clip: style.clipPath, offset: parseFloat(style.insetInlineStart), hidden }; })()`,
		);
		expect(result.clip).toBe('none');
		expect(result.offset).toBeLessThan(0);
		expect(result.hidden.length).toBeGreaterThan(0);
		for (const visibility of result.hidden) expect(visibility).toBe('hidden');
	});

	it('shifts nothing when the zoomed item is at the top level', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(0, 3);
		await editor.runCommand('zoom-in');
		await wait(300);
		const marked = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-line.roamer-zoom-line").length',
		);
		expect(marked).toBe(0);
	});

	it('puts everything back when the whole note is shown again', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await editor.runCommand('zoom-reset');
		await wait(300);
		const marked = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-line.roamer-zoom-line").length',
		);
		expect(marked).toBe(0);
	});

	it('still zooms to a deeper item by clicking its bullet', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		await wait(300);
		const bullet = await editor.bulletPoint(3);
		await app.click(bullet.x, bullet.y, false);
		await wait(300);
		expect(await editor.crumbs()).toEqual(['a', 'b', 'c', 'd']);
	});

	it('keeps the indentation when the setting is off', async () => {
		await app.evaluate(
			'(app.plugins.plugins["roamer"].settings.cleanZoom = false, app.workspace.updateOptions(), true)',
		);
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		const marked = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-line.roamer-zoom-line").length',
		);
		expect(marked).toBe(0);
		await app.evaluate(
			'(app.plugins.plugins["roamer"].settings.cleanZoom = true, app.workspace.updateOptions(), true)',
		);
	});
});

describe('caret and selection while zoomed in real Obsidian', () => {
	const SELECT = `(() => {
		const cm = app.workspace.activeEditor.editor.cm;
		cm.focus();
		cm.dispatch({ selection: { anchor: cm.state.doc.line(3).from + 3, head: cm.state.doc.line(4).to } });
		return true;
	})()`;

	const MEASURE = `(() => {
		const cm = app.workspace.activeEditor.editor.cm;
		const cursor = cm.dom.querySelector('.cm-cursor-primary');
		const transform = (selector) => getComputedStyle(cm.dom.querySelector(selector)).transform;
		return {
			caretGap: cursor ? Math.abs(cursor.getBoundingClientRect().left - cm.coordsAtPos(cm.state.selection.main.head).left) : null,
			cursorLayer: transform('.cm-cursorLayer'),
			selectionLayer: transform('.cm-selectionLayer'),
		};
	})()`;

	async function zoomedWithSelection(): Promise<{
		caretGap: number | null;
		cursorLayer: string;
		selectionLayer: string;
	}> {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(3, 5);
		await editor.runCommand('zoom-in');
		await app.evaluate(SELECT);
		await wait(400);
		return app.evaluate(MEASURE);
	}

	it('draws the caret where the text is', async () => {
		const measured = await zoomedWithSelection();
		expect(measured.caretGap).not.toBeNull();
		expect(measured.caretGap).toBeLessThan(2);
	});

	it('leaves the caret and selection layers where the editor puts them', async () => {
		const measured = await zoomedWithSelection();
		expect(measured.cursorLayer).toBe('none');
		expect(measured.selectionLayer).toBe('none');
	});
});

describe('select all while zoomed in real Obsidian', () => {
	const SELECTED = `(() => { const cm = app.workspace.activeEditor.editor.cm; const main = cm.state.selection.main; return cm.state.sliceDoc(main.from, main.to); })()`;

	it('selects the zoomed item with what is under it and never the hidden lines', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 5);
		await editor.runCommand('zoom-in');
		await wait(300);
		await app.pressKey('a', false, true);
		await wait(150);
		expect(await app.evaluate<string>(SELECTED)).toBe('c');
		await app.pressKey('a', false, true);
		await wait(150);
		expect(await app.evaluate<string>(SELECTED)).toBe('c\n\t\t\t- d');
		await app.pressKey('a', false, true);
		await wait(150);
		expect(await app.evaluate<string>(SELECTED)).toBe('c\n\t\t\t- d');
	});

	it('still selects the whole note when nothing is zoomed', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 5);
		await app.pressKey('a', false, true);
		await app.pressKey('a', false, true);
		await wait(150);
		expect(await app.evaluate<string>(SELECTED)).toBe(NOTE);
	});
});
