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
			`(app.saveLocalStorage("roamer-contract", { a: 1 }), app.loadLocalStorage("roamer-contract"))`,
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

describe('Obsidian DOM the plugin attaches to', () => {
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

describe('callout markup the plugin lays out', () => {
	it.each(['createSpan', 'createDiv', 'createEl'])('has the global %s helper', async (name) => {
		expect(await app.evaluate<string>(`typeof ${name}`)).toBe('function');
	});

	it('has setCssProps on elements', async () => {
		expect(await app.evaluate<string>('typeof HTMLElement.prototype.setCssProps')).toBe(
			'function',
		);
	});

	it('has requestMeasure on the editor view', async () => {
		expect(
			await app.evaluate<string>(
				'typeof app.workspace.activeEditor.editor.cm.requestMeasure',
			),
		).toBe('function');
	});

	it.each([
		'.roamer-callout-widget .callout[data-callout="tip"]',
		'.roamer-callout-widget .callout-title',
		'.roamer-callout-widget .callout-title-inner',
		'.roamer-callout-widget .callout-icon',
		'.roamer-callout-widget .callout-content',
		'.roamer-callout-line .list-bullet',
	])('renders %s around a callout bullet', async (selector) => {
		const callouts = await NoteEditor.open(app, '- a\n- > [!tip] t\n  > body\n- z');
		await callouts.caret(3, 2);
		await new Promise((resolve) => setTimeout(resolve, 1200));
		expect(
			await app.evaluate<boolean>(
				`Boolean(activeDocument.querySelector(${JSON.stringify(`.workspace-leaf.mod-active ${selector}`)}))`,
			),
		).toBe(true);
	});
});
