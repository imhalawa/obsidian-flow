import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;
let editor: NoteEditor;
let noteName: string;

const NOTE = ['# Heading', '- a', '\t- b', '- c'].join('\n');

beforeAll(async () => {
	app = await ObsidianApp.start();
	editor = await NoteEditor.open(app, NOTE);
	noteName = await app.evaluate<string>('app.workspace.getActiveFile().path');
});

afterAll(async () => {
	await app.stop();
});

/** Evaluates an expression in Obsidian and returns the names of the functions it reports missing. */
function missingFunctions(owner: string, names: string[]): Promise<string[]> {
	return app.evaluate<string[]>(
		`${JSON.stringify(names)}.filter((name) => typeof (${owner})[name] !== "function")`,
	);
}

describe('workspace API the plugin calls', () => {
	it.each([
		[
			'workspace.on',
			'app.workspace',
			['on', 'trigger', 'onLayoutReady', 'iterateAllLeaves', 'updateOptions'],
		],
		['commands', 'app.commands', ['executeCommandById']],
		['local storage', 'app', ['saveLocalStorage', 'loadLocalStorage']],
		['metadata cache', 'app.metadataCache', ['getFileCache']],
	])('%s still has the functions the plugin calls', async (_label, owner, names) => {
		expect(await missingFunctions(owner, names)).toEqual([]);
	});

	it('reports the open note through activeEditor', async () => {
		expect(await app.evaluate<boolean>('Boolean(app.workspace.activeEditor?.editor)')).toBe(
			true,
		);
	});

	it('reconfigures open editors through updateOptions without an error', async () => {
		const before = app.consoleErrors().length;
		await app.evaluate('(app.workspace.updateOptions(), true)');
		expect(app.consoleErrors().slice(before)).toEqual([]);
	});

	it('round-trips values through local storage', async () => {
		const stored = await app.evaluate<unknown>(
			`(app.saveLocalStorage("flow-contract", { a: 1 }), app.loadLocalStorage("flow-contract"))`,
		);
		expect(stored).toEqual({ a: 1 });
	});
});

describe('CodeMirror view behind the editor', () => {
	it.each(['dispatch', 'posAtCoords', 'lineBlockAt', 'coordsAtPos', 'focus'])(
		'exposes %s on the editor view',
		async (name) => {
			expect(
				await app.evaluate<string>(
					`typeof app.workspace.activeEditor.editor.cm[${JSON.stringify(name)}]`,
				),
			).toBe('function');
		},
	);

	it('exposes a state with field and facet', async () => {
		expect(
			await app.evaluate<string[]>(
				`["field", "facet", "doc", "selection"].filter((name) => app.workspace.activeEditor.editor.cm.state[name] === undefined)`,
			),
		).toEqual([]);
	});

	it('counts document lines like the editor does', async () => {
		expect(
			await app.evaluate<number>('app.workspace.activeEditor.editor.cm.state.doc.lines'),
		).toBe(4);
	});
});

describe('history the plugin wraps', () => {
	it('has back and forward as functions', async () => {
		expect(
			await app.evaluate<string[]>(
				`["back", "forward"].filter((name) => typeof window.history[name] !== "function")`,
			),
		).toEqual([]);
	});

	it('has the plugin wrapper installed on back and forward', async () => {
		expect(
			await app.evaluate<boolean>(
				`window.history.back !== Object.getPrototypeOf(window.history).back && window.history.forward !== Object.getPrototypeOf(window.history).forward`,
			),
		).toBe(true);
	});
});

describe('metadata cache list items', () => {
	it('lists every bullet with a position and a parent', async () => {
		const items = await app.evaluate<{ hasPosition: boolean; parent: number }[]>(
			`new Promise((resolve) => {
				const read = () => {
					const cache = app.metadataCache.getFileCache(app.vault.getFileByPath(${JSON.stringify(noteName)}));
					if (cache && cache.listItems && cache.listItems.length === 3) {
						resolve(cache.listItems.map((item) => ({ hasPosition: Boolean(item.position?.start), parent: item.parent })));
					} else setTimeout(read, 100);
				};
				read();
			})`,
		);
		expect(items).toEqual([
			{ hasPosition: true, parent: -1 },
			{ hasPosition: true, parent: 1 },
			{ hasPosition: true, parent: -1 },
		]);
	});
});

describe('Obsidian DOM the plugin attaches to', () => {
	it('keeps the header title container the breadcrumbs mount in', async () => {
		expect(
			await app.evaluate<boolean>(
				`Boolean(app.workspace.activeEditor.containerEl.querySelector(".view-header-title-container"))`,
			),
		).toBe(true);
	});

	it.each([
		'.cm-line',
		'.cm-formatting-list',
		'.HyperMD-list-line',
		'.cm-content',
		'.cm-scroller',
	])('renders %s in the live preview editor', async (selector) => {
		await editor.caret(0, 0);
		expect(
			await app.evaluate<boolean>(
				`Boolean(activeDocument.querySelector(${JSON.stringify(selector)}))`,
			),
		).toBe(true);
	});
});
