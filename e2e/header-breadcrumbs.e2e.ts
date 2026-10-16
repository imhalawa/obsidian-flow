import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
});

afterAll(async () => {
	await app.stop();
});

const NOTE = '- Some Idea\n\t- Bullet 1\n\t- Bullet 2\n\t\t- Bullet 3\n\t\t\t- Bullet 4\n- Another';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let noteCounter = 0;

/** Opens a note inside a folder, the way a vault keeps most notes. */
async function openInFolder(text: string): Promise<NoteEditor> {
	noteCounter += 1;
	return NoteEditor.openAt(app, `Inbox/Test ${noteCounter}.md`, text);
}

describe('breadcrumbs in the note header in real Obsidian', () => {
	it('shows the zoom path after the folder and the note name', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		expect(await editor.crumbs()).toEqual(['Some Idea', 'Bullet 2', 'Bullet 3']);
		const header = await editor.headerText();
		expect(header.indexOf('Inbox')).toBeLessThan(header.indexOf('Some Idea'));
		expect(header.indexOf(`Test ${noteCounter}`)).toBeLessThan(header.indexOf('Some Idea'));
	});

	it('draws the path inside the header, after the note title element', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		const after = await app.evaluate<boolean>(
			`(() => { const header = activeDocument.querySelector(".workspace-leaf.mod-active .view-header-title-container"); const title = header.querySelector(".view-header-title"); const crumbs = header.querySelector(".flow-crumbs"); return Boolean(title && crumbs && (title.compareDocumentPosition(crumbs) & Node.DOCUMENT_POSITION_FOLLOWING)); })()`,
		);
		expect(after).toBe(true);
	});

	it('draws nothing in the editor itself', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		const count = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-editor .flow-breadcrumbs").length',
		);
		expect(count).toBe(0);
	});

	it('removes the path when the whole note is shown again', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.runCommand('zoom-reset');
		expect(await editor.crumbs()).toEqual([]);
		expect(await editor.headerText()).not.toContain('Bullet');
	});

	it('zooms to a level when its crumb is clicked with the mouse', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(4, 5);
		await editor.runCommand('zoom-in');
		await editor.clickCrumb('Bullet 2');
		expect(await editor.crumbs()).toEqual(['Some Idea', 'Bullet 2']);
		expect(await editor.visibleLines()).toEqual([
			'\t- Bullet 2',
			'\t\t- Bullet 3',
			'\t\t\t- Bullet 4',
		]);
	});

	it('does not offer a click on the current level', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		const tag = await app.evaluate<string>(
			'activeDocument.querySelector(".workspace-leaf.mod-active .flow-crumbs__crumb.is-current").tagName',
		);
		expect(tag).not.toBe('A');
		expect(tag).not.toBe('BUTTON');
	});

	it('keeps the path after the note is renamed', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await app.evaluate(
			`app.fileManager.renameFile(app.workspace.getActiveFile(), "Inbox/Renamed ${noteCounter}.md")`,
		);
		await wait(500);
		expect(await editor.crumbs()).toEqual(['Some Idea', 'Bullet 2', 'Bullet 3']);
		expect(await editor.headerText()).toContain(`Renamed ${noteCounter}`);
	});
});

describe('the note title in the header while zoomed', () => {
	it('shows the whole note when it is clicked', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.clickTitle();
		expect(await editor.crumbs()).toEqual([]);
		expect(await editor.visibleLines()).toHaveLength(6);
	});

	it('shows the whole note when Enter is pressed on it', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.focusTitle();
		await app.pressKey('enter', false, false);
		await wait(200);
		expect(await editor.crumbs()).toEqual([]);
		expect(await editor.visibleLines()).toHaveLength(6);
	});

	it('shows a hand cursor so it reads as a link', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		expect(await editor.titleCursor()).toBe('pointer');
	});

	it('goes back to the native cursor when the whole note is shown', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.runCommand('zoom-reset');
		expect(await editor.titleCursor()).not.toBe('pointer');
	});

	it('still starts a rename when it is clicked and nothing is zoomed', async () => {
		const editor = await openInFolder(NOTE);
		await editor.clickTitle();
		expect(await editor.titleHasFocus()).toBe(true);
	});

	it('does not start a rename when it is clicked to show the whole note', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await editor.clickTitle();
		expect(await editor.titleHasFocus()).toBe(false);
	});
});

describe('a path that does not fit the header', () => {
	beforeEach(async () => {
		await app.movePointer(5, 600);
	});

	const DEEP = '- alpha\n\t- bravo\n\t\t- charlie\n\t\t\t- delta\n\t\t\t\t- echo';

	it('keeps the first level and the current item and collapses the middle', async () => {
		const editor = await openInFolder(DEEP);
		await editor.caret(4, 6);
		await editor.runCommand('zoom-in');
		await editor.limitHeaderWidth(200);
		expect(await editor.crumbs()).toEqual(['alpha', '…', 'echo']);
	});

	it('shows every level when there is room', async () => {
		const editor = await openInFolder(DEEP);
		await editor.caret(4, 6);
		await editor.runCommand('zoom-in');
		await editor.limitHeaderWidth(900);
		expect(await editor.crumbs()).toEqual(['alpha', 'bravo', 'charlie', 'delta', 'echo']);
	});

	it('lists the hidden levels in a menu and zooms to the one that is chosen', async () => {
		const editor = await openInFolder(DEEP);
		await editor.caret(4, 6);
		await editor.runCommand('zoom-in');
		await editor.limitHeaderWidth(200);
		await editor.clickCrumb('…');
		await wait(200);
		expect(await editor.menuEntries()).toEqual(['bravo', 'charlie', 'delta']);
		await editor.chooseMenuEntry('charlie');
		await wait(200);
		expect(await editor.visibleLines()).toEqual([
			'\t\t- charlie',
			'\t\t\t- delta',
			'\t\t\t\t- echo',
		]);
	});

	it('opens the menu from the keyboard', async () => {
		const editor = await openInFolder(DEEP);
		await editor.caret(4, 6);
		await editor.runCommand('zoom-in');
		await editor.limitHeaderWidth(200);
		await app.evaluate(
			'activeDocument.querySelector(".workspace-leaf.mod-active .flow-crumbs__more").focus()',
		);
		await app.pressKey('enter', false, false);
		await wait(200);
		expect(await editor.menuEntries()).toEqual(['bravo', 'charlie', 'delta']);
		await app.pressKey('escape', false, false);
	});

	it('shortens text that still overflows and keeps the full text in the page', async () => {
		const editor = await openInFolder(
			'- a very long first level title that cannot fit\n\t- a very long current item title that cannot fit either',
		);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		await editor.limitHeaderWidth(260);
		const result = await app.evaluate<{ clipped: boolean; label: string | null }>(
			`(() => { const crumb = activeDocument.querySelector(".workspace-leaf.mod-active .flow-crumbs__crumb.is-current"); const text = crumb.querySelector(".flow-crumbs__text"); return { clipped: text.scrollWidth > text.clientWidth, label: text.textContent }; })()`,
		);
		expect(result.clipped).toBe(true);
		expect(result.label).toBe('a very long current item title that cannot fit either');
	});

	it('lays the path out again when the header grows', async () => {
		const editor = await openInFolder(DEEP);
		await editor.caret(4, 6);
		await editor.runCommand('zoom-in');
		await editor.limitHeaderWidth(200);
		await editor.limitHeaderWidth(900);
		expect(await editor.crumbs()).toEqual(['alpha', 'bravo', 'charlie', 'delta', 'echo']);
	});
});

describe('long and formatted crumb labels', () => {
	beforeAll(async () => {
		await app.evaluate('(app.workspace.leftSplit.collapse(), true)');
	});

	beforeEach(async () => {
		await app.movePointer(5, 600);
	});

	const LONG =
		'When we start to plant the actual seedlings, it brings trays that either crowd the bed or spill the soil';
	const NOTE_WITH_LONG = `- **Garden tasks for spring**\n\t- ${LONG}\n\t\t- short`;

	interface CrumbBox {
		width: number;
		cut: boolean;
		overlay: boolean;
	}

	/** Reads the visible crumb with a label: its width, whether its text is cut and whether a card is drawn over the row. */
	const crumbBox = (label: string) =>
		app.evaluate<CrumbBox>(
			`(() => { const crumb = Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .flow-crumbs__crumb:not(.is-hidden)")).find((el) => el.textContent === ${JSON.stringify(label)}); const text = crumb.querySelector(".flow-crumbs__text"); const overlay = getComputedStyle(crumb, "::after").content; return { width: crumb.getBoundingClientRect().width, cut: text.scrollWidth > text.clientWidth, overlay: overlay !== "none" && overlay !== "normal" }; })()`,
		);

	/** Waits until the crumb with a label is wider than a width, then reads it. */
	async function crumbBoxWiderThan(label: string, width: number): Promise<CrumbBox> {
		let box = await crumbBox(label);
		for (let attempt = 0; attempt < 20 && box.width <= width; attempt += 1) {
			await wait(100);
			box = await crumbBox(label);
		}
		return box;
	}

	/** Returns the left and right edge of every visible crumb. */
	const crumbSpans = () =>
		app.evaluate<{ left: number; right: number }[]>(
			'Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .flow-crumbs__crumb:not(.is-hidden)")).map((el) => { const box = el.getBoundingClientRect(); return { left: box.left, right: box.right }; })',
		);

	/** Zooms to the second item of a note and moves the pointer over the crumb with a label. */
	async function hoverCrumb(text: string, label: string): Promise<NoteEditor> {
		const editor = await openInFolder(text);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		const point = await editor.crumbPoint(label);
		await app.movePointer(point.x, point.y);
		await wait(400);
		return editor;
	}

	it('cuts a long label with an ellipsis instead of showing it in full', async () => {
		const editor = await openInFolder(NOTE_WITH_LONG);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		const box = await crumbBox(LONG);
		expect(box.cut).toBe(true);
		expect(box.width).toBeLessThan(420);
	});

	/** Zooms into the second item of a note, notes the width of a crumb, then moves the pointer over it. */
	async function widthBeforeAndAfterHover(
		text: string,
		label: string,
	): Promise<[number, number]> {
		const editor = await openInFolder(text);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		const before = (await crumbBox(label)).width;
		const point = await editor.crumbPoint(label);
		await app.movePointer(point.x, point.y);
		return [before, (await crumbBoxWiderThan(label, before)).width];
	}

	it('grows the current crumb in the row while the pointer is over it', async () => {
		const [before, after] = await widthBeforeAndAfterHover(NOTE_WITH_LONG, LONG);
		expect(after).toBeGreaterThan(before);
	});

	it('grows a level above the current item while the pointer is over it', async () => {
		const [before, after] = await widthBeforeAndAfterHover(`- ${LONG}\n\t- short`, LONG);
		expect(after).toBeGreaterThan(before);
	});

	it('covers no crumb while a cut label is shown in full', async () => {
		await hoverCrumb(NOTE_WITH_LONG, LONG);
		const spans = await crumbSpans();
		spans.slice(1).forEach((span, index) => {
			expect(span.left).toBeGreaterThanOrEqual((spans[index]?.right ?? 0) - 1);
		});
		expect((await crumbBox(LONG)).overlay).toBe(false);
	});

	it('cuts the label again when the pointer leaves it', async () => {
		await hoverCrumb(NOTE_WITH_LONG, LONG);
		await app.movePointer(5, 600);
		await wait(400);
		expect((await crumbBox(LONG)).cut).toBe(true);
	});

	it('changes nothing while the pointer is over a label that fits', async () => {
		const editor = await openInFolder('- **Garden tasks for spring**\n\t- short');
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		const before = await crumbBox('Garden tasks for spring');
		const point = await editor.crumbPoint('Garden tasks for spring');
		await app.movePointer(point.x, point.y);
		await wait(400);
		expect((await crumbBox('Garden tasks for spring')).width).toBe(before.width);
	});

	it('names a cut crumb by its full text and shows no tooltip over the row', async () => {
		const editor = await openInFolder(`- ${LONG}\n\t- short`);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		const result = await app.evaluate<{ name: string | null; label: string | null }>(
			'(() => { const crumb = activeDocument.querySelector(".workspace-leaf.mod-active .flow-crumbs__crumb:not(.is-current)"); return { name: crumb.textContent, label: crumb.getAttribute("aria-label") }; })()',
		);
		expect(result).toEqual({ name: LONG, label: null });
	});

	it('shows a level without its markdown markers', async () => {
		const editor = await openInFolder(NOTE_WITH_LONG);
		await editor.caret(1, 4);
		await editor.runCommand('zoom-in');
		expect(await editor.crumbs()).toEqual(['Garden tasks for spring', LONG]);
	});
});

describe('the header path across panes and plugin state in real Obsidian', () => {
	it('shows each pane its own path', async () => {
		const first = await openInFolder(NOTE);
		await first.caret(3, 4);
		await first.runCommand('zoom-in');
		await app.evaluate(
			`(async () => { const file = await app.vault.create('Inbox/Side ${noteCounter}.md', '- x\\n\\t- y'); await app.workspace.getLeaf('split', 'vertical').openFile(file); return true; })()`,
		);
		await wait(400);
		const counts = await app.evaluate<number[]>(
			'Array.from(activeDocument.querySelectorAll(".workspace-leaf")).filter((leaf) => leaf.querySelector(".view-header-title-container")).map((leaf) => leaf.querySelectorAll(".flow-crumbs__crumb:not(.is-hidden)").length)',
		);
		expect(counts.filter((count) => count > 0)).toHaveLength(1);
	});

	it('removes the path when the plugin is turned off', async () => {
		const editor = await openInFolder(NOTE);
		await editor.caret(3, 4);
		await editor.runCommand('zoom-in');
		await app.evaluate('app.plugins.disablePlugin("flow-outliner")');
		await wait(300);
		const left = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".flow-crumbs").length',
		);
		expect(left).toBe(0);
		await app.evaluate('app.plugins.enablePlugin("flow-outliner")');
		await wait(500);
	});
});
