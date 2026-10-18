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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const COMMANDS = [
	'zoom-in',
	'fold-item',
	'unfold-item',
	'move-item-down',
	'move-item-up',
	'indent-item',
	'outdent-item',
	'fold-all',
	'unfold-all',
	'zoom-out',
	'zoom-history-back',
	'zoom-history-forward',
	'zoom-reset',
];

/** Runs every command with the caret on every line of the open note and returns the errors logged meanwhile. */
async function hammer(editor: NoteEditor): Promise<string[]> {
	const before = app.consoleErrors().length;
	const lines = (await editor.text()).split('\n').length;
	for (let line = 0; line < lines; line += 1) {
		for (const command of COMMANDS) {
			const last = (await editor.text()).split('\n').length - 1;
			await editor.caret(Math.min(line, last), 0);
			await editor.runCommand(command);
		}
	}
	return app.consoleErrors().slice(before);
}

describe('commands survive every kind of note', () => {
	it.each([
		[
			'ordered, task and other bullet markers',
			'1. one\n2. two\n\t- [ ] task\n\t- [x] done\n* star\n\t+ plus\n- dash',
		],
		['mixed tabs and spaces', '- a\n  - b\n\t- c\n    - d\n\t\t- e'],
		['headings with lists below them', '# H1\n- a\n\t- b\n## H2\n- c\n\t- d\n# H1 again\n- e'],
		['frontmatter then a list', '---\ntitle: x\n---\n- a\n\t- b\n\t\t- c'],
		[
			'emoji, accents and right to left text',
			'- 🚀 launch\n\t- café ☕\n\t\t- שלום עולם\n- 日本語のアイテム',
		],
		[
			'block ids and embeds in items',
			'- a ^id1\n\t- ![[other#^id2]]\n\t- ![[whole note]]\n- b [[link]]',
		],
		['empty lines between items', '- a\n\n\t- b\n\n\n\t\t- c\n\n- d'],
		['an empty note', ''],
		['only frontmatter', '---\ntitle: x\n---'],
		['a single item', '- only'],
		['a very long line', `- ${'word '.repeat(4000)}\n\t- child`],
		[
			'deep nesting',
			Array.from({ length: 30 }, (_, depth) => `${'\t'.repeat(depth)}- level ${depth}`).join(
				'\n',
			),
		],
		['code block with list lookalikes', '- a\n```\n- not an item\n\t- nor this\n```\n- b'],
		[
			'callout and quote with bullets',
			'> - quoted\n> \t- nested quote\n\n> [!note]\n> - in callout\n\n- real',
		],
	])(
		'%s',
		async (_name, note) => {
			const editor = await NoteEditor.open(app, note);
			await wait(300);
			expect(await hammer(editor)).toEqual([]);
		},
		120000,
	);

	it('keeps the text of the note intact when every command ran and was undone', async () => {
		const note = '- a\n\t- b\n\t\t- c\n- d\n\t- e';
		const editor = await NoteEditor.open(app, note);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		for (const command of ['fold-item', 'unfold-item', 'move-item-down', 'move-item-up']) {
			await editor.runCommand(command);
		}
		await editor.runCommand('zoom-reset');
		expect((await editor.text()).split('\n').sort()).toEqual(note.split('\n').sort());
	});
});

describe('switching and removing notes while zoomed', () => {
	const NOTE = '- a\n\t- b\n\t\t- c\n- d';

	it('remembers a zoom that was changed a moment before another note was opened', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		const path = await editor.path();
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		await app.evaluate(
			`(async () => { const other = await app.vault.create('quick-' + Date.now() + '.md', 'x'); await app.workspace.getLeaf(false).openFile(other); return true; })()`,
		);
		await app.evaluate(
			`(async () => { await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath(${JSON.stringify(path)})); return true; })()`,
		);
		expect(await editor.waitForCrumbs(3000)).toEqual(['a', 'b']);
	});

	it('does not log errors when the zoomed note is deleted under the open editor', async () => {
		const before = app.consoleErrors().length;
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		await app.evaluate(
			'(async () => { await app.vault.delete(app.workspace.getActiveFile()); return true; })()',
		);
		await wait(1500);
		expect(app.consoleErrors().slice(before)).toEqual([]);
	});

	it('keeps no more than the most recent notes in the zoom memory', async () => {
		await app.evaluate(
			`(async () => { for (let i = 0; i < 230; i += 1) { const file = await app.vault.create('cap-' + i + '.md', '- a\\n\\t- b'); await app.workspace.getLeaf(false).openFile(file); const cm = app.workspace.activeEditor?.editor?.cm; if (cm) cm.dispatch({ selection: { anchor: 6 } }); app.commands.executeCommandById('roamer:zoom-in'); } return true; })()`,
		);
		await wait(1500);
		const remembered = await app.evaluate<number>(
			`Object.keys(app.loadLocalStorage('roamer-zoom') ?? {}).length`,
		);
		expect(remembered).toBeGreaterThan(100);
		expect(remembered).toBeLessThanOrEqual(200);
	}, 180000);
});

describe('the real keyboard cannot reach text hidden by a zoom', () => {
	const NOTE = 'top\n- a\n\t- b\n\t\t- c\n- d\ntail';

	const zoomedEditor = async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(2, 3);
		await editor.runCommand('zoom-in');
		await editor.focus();
		return editor;
	};

	it.each([
		['Backspace at the start of the zoomed item', 'backspace', 2, 0],
		['Delete at the end of the zoomed item', 'delete', 3, 5],
	] as const)('%s', async (_name, key, line, ch) => {
		const editor = await zoomedEditor();
		await editor.caret(line, ch);
		await app.pressKey(key, false, false);
		await wait(200);
		expect(await editor.text()).toBe(NOTE);
	});

	it('does not let select all and Delete wipe the hidden part', async () => {
		const editor = await zoomedEditor();
		await editor.caret(2, 3);
		await app.pressKey('a', false, true);
		await app.pressKey('delete', false, false);
		await wait(200);
		const text = await editor.text();
		expect(text.startsWith('top\n- a\n')).toBe(true);
		expect(text.endsWith('- d\ntail')).toBe(true);
	});
});
