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

const createNote = (path: string, text: string) =>
	app.evaluate(
		`app.vault.create(${JSON.stringify(path)}, ${JSON.stringify(text)}).then(() => true)`,
	);

const modifyNote = (path: string, text: string) =>
	app.evaluate(
		`(async () => { await app.vault.modify(app.vault.getFileByPath(${JSON.stringify(path)}), ${JSON.stringify(text)}); return true; })()`,
	);

/** Replaces the whole text of the open note the way a refresh or a sync does. */
const replaceOpenNote = (text: string) =>
	app.evaluate(`(app.workspace.activeEditor.editor.setValue(${JSON.stringify(text)}), true)`);

const readNote = (path: string) =>
	app.evaluate<string>(`app.vault.adapter.read(${JSON.stringify(path)})`);

/** Opens a note in a named pane; a new pane is split off the active one unless the name is taken. */
const openInPane = (name: string, path: string, split: boolean) =>
	app.evaluate(
		`(async () => {
			window.__panes = window.__panes || {};
			const leaf = window.__panes[${JSON.stringify(name)}] ?? app.workspace.getLeaf(${split ? '"split"' : 'false'});
			window.__panes[${JSON.stringify(name)}] = leaf;
			await leaf.openFile(app.vault.getFileByPath(${JSON.stringify(path)}));
			app.workspace.setActiveLeaf(leaf, { focus: true });
			return true;
		})()`,
	);

const activatePane = (name: string) =>
	app.evaluate(
		`(app.workspace.setActiveLeaf(window.__panes[${JSON.stringify(name)}], { focus: true }), true)`,
	);

/** Waits up to a limit for the item suggestions to show and returns their texts, possibly none. */
const suggestionsWithin = (ms: number) =>
	app.evaluate<string[]>(
		`new Promise((resolve) => { const end = Date.now() + ${ms}; const read = () => Array.from(activeDocument.querySelectorAll(".flow-item-suggest-text")).map((el) => el.textContent); const check = () => { const found = read(); if (found.length > 0 || Date.now() > end) resolve(found); else setTimeout(check, 50); }; check(); })`,
	);

const closeSuggestions = () =>
	app.evaluate('(app.workspace.activeEditor.editor.cm.contentDOM.focus(), true)');

/** Polls a read until it satisfies a check or the time is up, and returns the last value. */
async function settle<T>(
	read: () => Promise<T>,
	done: (value: T) => boolean,
	ms: number,
): Promise<T> {
	const end = Date.now() + ms;
	let value = await read();
	while (!done(value) && Date.now() < end) {
		await wait(100);
		value = await read();
	}
	return value;
}

/** Waits until Obsidian has indexed a block id in a note. */
const waitForBlock = (path: string, id: string) =>
	app.evaluate(
		`new Promise((resolve) => { const check = () => { const file = app.vault.getFileByPath(${JSON.stringify(path)}); if (file && app.metadataCache.getFileCache(file)?.blocks?.[${JSON.stringify(id)}]) resolve(true); else setTimeout(check, 50); }; check(); })`,
	);

/** Waits until no item suggestion is on screen, so the next one read is a fresh list. */
const suggestionsGone = () =>
	settle(
		() =>
			app.evaluate<number>(
				'activeDocument.querySelectorAll(".flow-item-suggest-text").length',
			),
		(count) => count === 0,
		3000,
	);

const embedText = () =>
	app.evaluate<string | null>(
		`(() => { const el = activeDocument.querySelector('.workspace-leaf.mod-active .cm-content .markdown-embed-content'); return el ? el.textContent.trim() : null; })()`,
	);

describe('item suggester stays in step with the vault', () => {
	it('finds an item that was typed a moment ago in another open note', async () => {
		await createNote('fresh-source.md', '- seed');
		await createNote('fresh-target.md', '- see ');
		await openInPane('source', 'fresh-source.md', false);
		await openInPane('target', 'fresh-target.md', true);
		await activatePane('source');
		const source = NoteEditor.attach(app);
		await source.typeKeys('\n- unsaved zebra item');
		await activatePane('target');
		await NoteEditor.attach(app).typeKeys('((zebra');
		expect(await suggestionsWithin(3000)).toContain('unsaved zebra item');
	});

	it('shows the new text of an item after its note was edited', async () => {
		await createNote('edit-source.md', '- apple pie');
		await createNote('edit-target.md', '- see ');
		await openInPane('edit-target', 'edit-target.md', false);
		const target = NoteEditor.attach(app);
		await target.waitUntilIndexed('edit-source.md');
		await target.typeKeys('((apple');
		expect(await suggestionsWithin(3000)).toContain('apple pie');
		await closeSuggestions();
		await modifyNote('edit-source.md', '- apple tart');
		await wait(300);
		await target.replace(0, 0, 15, '- see ');
		await suggestionsGone();
		await target.typeKeys('((apple');
		const shown = await suggestionsWithin(3000);
		expect(shown).toContain('apple tart');
		expect(shown).not.toContain('apple pie');
	});

	it('stops offering the items of a deleted note and follows a renamed one', async () => {
		await createNote('gone-note.md', '- quince one');
		await createNote('moved-note.md', '- quince two');
		await createNote('quince-target.md', '- see ');
		await openInPane('quince', 'quince-target.md', false);
		const target = NoteEditor.attach(app);
		await target.waitUntilIndexed('gone-note.md');
		await target.waitUntilIndexed('moved-note.md');
		await app.evaluate(
			`(async () => { await app.vault.delete(app.vault.getFileByPath("gone-note.md")); await app.fileManager.renameFile(app.vault.getFileByPath("moved-note.md"), "renamed-note.md"); return true; })()`,
		);
		await wait(300);
		await target.typeKeys('((quince');
		const rows = await app.evaluate<string[]>(
			`new Promise((resolve) => setTimeout(() => resolve(Array.from(activeDocument.querySelectorAll(".flow-item-suggest-path")).map((el) => el.textContent)), 1500))`,
		);
		expect(rows).toContain('renamed-note.md');
		expect(rows).not.toContain('gone-note.md');
		expect(rows).not.toContain('moved-note.md');
	});

	it('links the item that was chosen even when its note changed after the list was shown', async () => {
		await createNote('shift-source.md', '- apple\n- banana');
		await createNote('shift-target.md', '- see ');
		await openInPane('shift', 'shift-target.md', false);
		const target = NoteEditor.attach(app);
		await target.waitUntilIndexed('shift-source.md');
		await target.typeKeys('((banana');
		expect(await suggestionsWithin(3000)).toContain('banana');
		await modifyNote('shift-source.md', '- new one\n- new two\n- apple\n- banana');
		await wait(200);
		await target.chooseSuggestion('banana');
		await wait(1500);
		const source = await readNote('shift-source.md');
		expect(source).toMatch(/^- new one\n- new two\n- apple\n- banana \^[a-z0-9]{6}$/);
	});
});

describe('embedded items stay live', () => {
	const EMBEDDING = '- ![[embed-source#^live01]]\n- next item';

	it('shows the new text of the source item after the source note is edited', async () => {
		await createNote('embed-source.md', '- alpha ^live01');
		await waitForBlock('embed-source.md', 'live01');
		await createNote('embed-host.md', EMBEDDING);
		await openInPane('embed', 'embed-host.md', false);
		const first = await settle(embedText, (text) => text?.includes('alpha') === true, 5000);
		expect(first).toContain('alpha');
		await modifyNote('embed-source.md', '- beta ^live01');
		const next = await settle(embedText, (text) => text?.includes('beta') === true, 5000);
		expect(next).toContain('beta');
	});

	it('keeps laying the embed out beside its bullet while the source grows', async () => {
		await createNote('grow-source.md', '- short ^grow01');
		await waitForBlock('grow-source.md', 'grow01');
		await createNote('grow-host.md', '- ![[grow-source#^grow01]]\n- below');
		await openInPane('grow', 'grow-host.md', false);
		await settle(embedText, (text) => text?.includes('short') === true, 5000);
		await modifyNote(
			'grow-source.md',
			'- short\n\t- child one\n\t- child two\n\t- child three\n\t- child four\n\t- child five ^grow01',
		);
		await settle(embedText, (text) => text?.includes('child five') === true, 5000);
		await wait(600);
		const layout = await app.evaluate<{
			embedBottom: number;
			nextTop: number;
			marked: boolean;
		}>(
			`(() => { const lines = Array.from(activeDocument.querySelectorAll('.workspace-leaf.mod-active .cm-line')); const hostLine = lines.find((l) => l.querySelector('.internal-embed')); const next = lines[lines.indexOf(hostLine) + 1]; const embed = hostLine.querySelector('.internal-embed').getBoundingClientRect(); return { embedBottom: embed.bottom, nextTop: next.getBoundingClientRect().top, marked: hostLine.classList.contains('flow-embed-line') }; })()`,
		);
		expect(layout.marked).toBe(true);
		expect(layout.nextTop).toBeGreaterThanOrEqual(layout.embedBottom - 1);
	});

	it('marks an item as an embed item as soon as an embed is typed into it and clears the mark when it is removed', async () => {
		const editor = await NoteEditor.open(app, '- plain');
		const marked = () =>
			app.evaluate<boolean>(
				`activeDocument.querySelector('.workspace-leaf.mod-active .cm-line.flow-embed-line') !== null`,
			);
		expect(await marked()).toBe(false);
		await editor.replace(0, 2, 7, '![[embed-source#^live01]]');
		expect(await settle(marked, (value) => value, 1000)).toBe(true);
		await editor.replace(0, 2, 27, 'plain');
		expect(await settle(marked, (value) => !value, 1000)).toBe(false);
	});

	it('shows the embed of a zoomed item live', async () => {
		await createNote('zoom-embed-source.md', '- first ^zoom01');
		await waitForBlock('zoom-embed-source.md', 'zoom01');
		await createNote('zoom-embed-host.md', '- parent\n\t- ![[zoom-embed-source#^zoom01]]');
		await openInPane('zoom-embed', 'zoom-embed-host.md', false);
		const editor = NoteEditor.attach(app);
		await editor.caret(0, 3);
		await editor.runCommand('zoom-in');
		await settle(embedText, (text) => text?.includes('first') === true, 5000);
		await modifyNote('zoom-embed-source.md', '- second ^zoom01');
		const next = await settle(embedText, (text) => text?.includes('second') === true, 5000);
		expect(next).toContain('second');
	});
});

describe('open notes follow changes made elsewhere', () => {
	const NOTE = '- a\n\t- b\n\t\t- c\n- d';

	it('keeps the zoom on the same item when lines are added above it on disk', async () => {
		await createNote('sync-above.md', NOTE);
		await openInPane('sync-above', 'sync-above.md', false);
		const editor = NoteEditor.attach(app);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		expect(await editor.crumbs()).toEqual(['a', 'b']);
		await replaceOpenNote(`- new top\n${NOTE}`);
		await wait(800);
		expect(await editor.crumbs()).toEqual(['a', 'b']);
		expect(await editor.visibleLines()).toEqual(['\t- b', '\t\t- c']);
	});

	it('leaves the zoom on a note that is rewritten so that its item is gone', async () => {
		await createNote('sync-gone.md', NOTE);
		await openInPane('sync-gone', 'sync-gone.md', false);
		const editor = NoteEditor.attach(app);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		await replaceOpenNote('- x\n- y');
		await wait(800);
		const lines = await editor.visibleLines();
		expect(lines.length).toBeGreaterThan(0);
		expect(lines.join('\n')).toMatch(/- [xy]/);
	});

	it('shows in a zoomed pane what is typed in another pane of the same note', async () => {
		await createNote('two-panes.md', NOTE);
		await openInPane('left', 'two-panes.md', false);
		await NoteEditor.attach(app).caret(1, 3);
		await NoteEditor.attach(app).runCommand('zoom-in');
		await openInPane('right', 'two-panes.md', true);
		await wait(300);
		const right = NoteEditor.attach(app);
		await right.type({ line: 2, ch: 5 }, ' edited');
		await activatePane('left');
		const left = NoteEditor.attach(app);
		await settle(
			() => left.visibleLines(),
			(lines) => lines.join('').includes('edited'),
			2000,
		);
		expect(await left.visibleLines()).toEqual(['\t- b', '\t\t- c edited']);
		expect(await left.crumbs()).toEqual(['a', 'b']);
	});

	it('restores the zoom of a note that was renamed', async () => {
		await createNote('rename-me.md', NOTE);
		await openInPane('rename', 'rename-me.md', false);
		const editor = NoteEditor.attach(app);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		await wait(1200);
		await app.evaluate(
			`(async () => { await app.fileManager.renameFile(app.vault.getFileByPath("rename-me.md"), "renamed-me.md"); return true; })()`,
		);
		await wait(500);
		await editor.reopen();
		await wait(800);
		expect(await editor.waitForCrumbs(3000)).toEqual(['a', 'b']);
	});
});

describe('plugin lifecycle stays clean', () => {
	it('keeps one set of controls and one zoom per click after the plugin is turned off and on three times', async () => {
		const editor = await NoteEditor.open(app, '- a\n\t- b\n\t\t- c\n- d');
		for (let round = 0; round < 3; round += 1) {
			await app.evaluate(
				`(async () => { await app.plugins.disablePlugin("flow-outliner"); await app.plugins.enablePlugin("flow-outliner"); return true; })()`,
			);
			await wait(500);
		}
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		await wait(400);
		const copies = await app.evaluate<number>(
			`activeDocument.querySelectorAll('.workspace-leaf.mod-active .flow-crumbs').length`,
		);
		expect(copies).toBe(1);
		const zoomed = await editor.bulletPoint(2);
		await app.click(zoomed.x, zoomed.y, false);
		await wait(400);
		expect(await editor.crumbs()).toEqual(['a', 'b', 'c']);
	});

	it('survives opening and closing many notes quickly without logging errors', async () => {
		const before = await app.evaluate<number>('window.__errors ? window.__errors.length : 0');
		await app.evaluate(
			`(() => { window.__errors = window.__errors || []; window.addEventListener('error', (e) => window.__errors.push(String(e.message))); return true; })()`,
		);
		for (let index = 0; index < 25; index += 1) {
			await createNote(`churn-${index}.md`, `- a ${index}\n\t- b\n\t\t- c`);
		}
		await app.evaluate(
			`(async () => { const leaf = app.workspace.getLeaf(false); for (let i = 0; i < 25; i += 1) { await leaf.openFile(app.vault.getFileByPath('churn-' + i + '.md')); const cm = app.workspace.activeEditor?.editor?.cm; if (cm) cm.dispatch({ selection: { anchor: 6 } }); app.commands.executeCommandById('flow-outliner:zoom-in'); } return true; })()`,
		);
		await wait(1500);
		const errors = await app.evaluate<string[]>('window.__errors');
		expect(errors.slice(before)).toEqual([]);
	});
});

describe('real user sessions', () => {
	const NOTE = '- a\n\t- b\n\t\t- c\n- d';

	it('offers an item typed a moment ago in the same note after the link opener', async () => {
		const editor = await NoteEditor.open(app, '- seed');
		await editor.typeKeys('\n- fresh zebra\n- see ((zebra');
		expect(await suggestionsWithin(3000)).toContain('fresh zebra');
	});

	it('updates the embed layout of an open note at once when the title setting is switched', async () => {
		await createNote('title-source.md', '- titled ^title01');
		await waitForBlock('title-source.md', 'title01');
		await createNote('title-host.md', '- ![[title-source#^title01]]');
		await openInPane('title', 'title-host.md', false);
		await settle(embedText, (text) => text?.includes('titled') === true, 5000);
		const untitled = () =>
			app.evaluate<boolean>(
				`activeDocument.querySelector('.workspace-leaf.mod-active .cm-line.flow-embed-untitled') !== null`,
			);
		const setting = (value: boolean) =>
			app.evaluate(
				`(app.plugins.plugins["flow-outliner"].settings.hideEmbedTitles = ${value}, app.workspace.updateOptions(), true)`,
			);
		await setting(true);
		expect(await settle(untitled, (value) => value, 1000)).toBe(true);
		await setting(false);
		expect(await settle(untitled, (value) => !value, 1000)).toBe(false);
		await setting(true);
	});

	it('keeps the zoom when the note is shown in reading view and then edited again', async () => {
		await createNote('reading-trip.md', NOTE);
		await openInPane('reading', 'reading-trip.md', false);
		const editor = NoteEditor.attach(app);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		const toMode = (mode: string) =>
			app.evaluate(
				`(async () => { const leaf = window.__panes.reading; const state = leaf.getViewState(); state.state.mode = ${JSON.stringify(mode)}; await leaf.setViewState(state); return true; })()`,
			);
		await toMode('preview');
		await wait(600);
		await toMode('source');
		await wait(800);
		expect(await editor.waitForCrumbs(3000)).toEqual(['a', 'b']);
		expect(await editor.visibleLines()).toEqual(['\t- b', '\t\t- c']);
	});

	it('leaves the zoom when the zoomed item is deleted in another pane of the same note', async () => {
		await createNote('delete-zoomed.md', NOTE);
		await openInPane('del-left', 'delete-zoomed.md', false);
		await NoteEditor.attach(app).caret(1, 3);
		await NoteEditor.attach(app).runCommand('zoom-in');
		await openInPane('del-right', 'delete-zoomed.md', true);
		await NoteEditor.attach(app).runCommand('zoom-reset');
		await wait(300);
		await app.evaluate(
			'(() => { const cm = app.workspace.activeEditor.editor.cm; cm.dispatch({ changes: { from: cm.state.doc.line(2).from, to: cm.state.doc.line(4).from }, userEvent: "delete.cut" }); return true; })()',
		);
		await wait(300);
		await activatePane('del-left');
		const left = NoteEditor.attach(app);
		const lines = await settle(
			() => left.visibleLines(),
			(shown) => shown.join('') === '- a- d',
			2000,
		);
		expect(lines).toEqual(['- a', '- d']);
		expect(await left.crumbs()).toEqual([]);
	});

	it('updates the breadcrumbs of a zoomed pane when an ancestor is renamed in another pane', async () => {
		await createNote('crumbs-live.md', NOTE);
		await openInPane('crumb-left', 'crumbs-live.md', false);
		await NoteEditor.attach(app).caret(1, 3);
		await NoteEditor.attach(app).runCommand('zoom-in');
		await openInPane('crumb-right', 'crumbs-live.md', true);
		await NoteEditor.attach(app).runCommand('zoom-reset');
		await wait(300);
		await NoteEditor.attach(app).type({ line: 0, ch: 3 }, ' renamed');
		await wait(300);
		await activatePane('crumb-left');
		const left = NoteEditor.attach(app);
		const crumbs = await settle(
			() => left.crumbs(),
			(shown) => shown.join('/') === 'a renamed/b',
			2000,
		);
		expect(crumbs).toEqual(['a renamed', 'b']);
	});

	it('undoes and redoes a paste inside a zoom without losing the zoom', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(1, 3);
		await editor.runCommand('zoom-in');
		await editor.select({ anchor: { line: 2, ch: 5 }, head: { line: 2, ch: 5 } });
		await editor.paste('\n\t\t- x\n\t\t- y');
		expect(await editor.visibleLines()).toEqual(['\t- b', '\t\t- c', '\t\t- x', '\t\t- y']);
		await editor.undo();
		expect(await editor.visibleLines()).toEqual(['\t- b', '\t\t- c']);
		await app.evaluate('(app.workspace.activeEditor.editor.redo(), true)');
		expect(await editor.visibleLines()).toEqual(['\t- b', '\t\t- c', '\t\t- x', '\t\t- y']);
		expect(await editor.crumbs()).toEqual(['a', 'b']);
	});

	it('shows the embed again after its block id is removed and added back', async () => {
		await createNote('flip-source.md', '- flip ^flip01');
		await waitForBlock('flip-source.md', 'flip01');
		await createNote('flip-host.md', '- ![[flip-source#^flip01]]\n- below');
		await openInPane('flip', 'flip-host.md', false);
		await settle(embedText, (text) => text?.includes('flip') === true, 5000);
		await modifyNote('flip-source.md', '- flip');
		await wait(1200);
		await modifyNote('flip-source.md', '- flop ^flip01');
		const text = await settle(embedText, (value) => value?.includes('flop') === true, 8000);
		expect(text).toContain('flop');
	});

	it('survives a burst of zoom, fold and move commands without logging errors', async () => {
		const editor = await NoteEditor.open(app, '- a\n\t- b\n\t\t- c\n\t- d\n- e\n\t- f');
		await app.evaluate(
			`(() => { window.__burst = []; window.addEventListener('error', (e) => window.__burst.push(String(e.message))); return true; })()`,
		);
		const commands = [
			'zoom-in',
			'fold-item',
			'unfold-item',
			'zoom-out',
			'move-item-down',
			'move-item-up',
			'indent-item',
			'outdent-item',
			'fold-all',
			'unfold-all',
			'zoom-history-back',
			'zoom-history-forward',
			'zoom-reset',
		];
		for (let round = 0; round < 12; round += 1) {
			for (const command of commands) {
				await editor.caret(round % 6, 3);
				await editor.runCommand(command);
			}
		}
		const errors = await app.evaluate<string[]>('window.__burst');
		expect(errors).toEqual([]);
		const text = await editor.text();
		expect(text.split('\n').filter((line) => line.trim() !== '').length).toBe(6);
	});
});
