import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseSpecs, toKeyPress, type BehaviourSpec } from './support/behaviour-spec';
import { parseMarked, renderMarked } from './support/marked-state';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

/**
 * Runs the behaviour specs copied from imhalawa/obsidian-roamer (e2e/specs) in real Obsidian.
 * A spec is run when its platform is linux or unset, it sets nothing, and every key is supported.
 * Specs that set a Roamer-only setting or press a key Flow does not touch are not generated.
 */
const SPEC_FILES: { file: string; settings: Record<string, boolean> }[] = [
	{ file: 'DefaultObsidianBehaviour.spec.md', settings: {} },
	{ file: 'EnterBehaviourOverride.spec.md', settings: {} },
	{ file: 'BackspaceBehaviourOverride.spec.md', settings: {} },
	{ file: 'CtrlAAndCmdABehaviourOverride.spec.md', settings: {} },
	{ file: 'TabBehaviourOverride.spec.md', settings: { tabIndentsItem: true } },
	{ file: 'ShiftTabBehaviourOverride.spec.md', settings: { tabIndentsItem: true } },
	{ file: 'ListsMovementCommands.spec.md', settings: {} },
];

/** Roamer specs that Flow does not match yet; each is a missing outliner behavior, not a change to Obsidian. */
const NOT_YET_MATCHING = new Set([
	"enter should delete list item if it's last item and it's on the top level",
	"enter should delete list item if it's last item and it's on the top level and it's checkbox",
	'enter should create new item on the same level and remove selection',
	'enter should create new item on the same level and remove selection between words',
	'enter should fallback behavior while multiline selection',
	'enter should fallback behavior while multiline selection with nested bullets',
	"backspace should work as regular if it's first line without children",
	"backspace should do nothing if it's first line with children",
	"backspace should remove note line if it's empty",
	"backspace should remove note line if it isn't empty and cursor on the line start",
	'ctrl-a should select list item content excluding custom checkbox',
	'ctrl-a should select list whole list after second invoke',
]);

const COMMANDS: Record<string, string> = {
	'obsidian-outliner:indent-list': 'indent-item',
	'obsidian-outliner:outdent-list': 'outdent-item',
	'obsidian-outliner:move-list-item-up': 'move-item-up',
	'obsidian-outliner:move-list-item-down': 'move-item-down',
};

const isRunnable = (spec: BehaviourSpec): boolean =>
	(spec.platform === null || spec.platform === 'linux') &&
	spec.settings.length === 0 &&
	!NOT_YET_MATCHING.has(spec.title) &&
	spec.steps.every((step) => {
		if (step.kind === 'key') return toKeyPress(step.shortcut) !== null;
		if (step.kind === 'execute') return step.command in COMMANDS;
		return true;
	});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
	await app.evaluate(
		'(app.vault.setConfig("useTab", false), app.vault.setConfig("tabSize", 2), true)',
	);
});

afterAll(async () => {
	await app.stop();
});

/** Plays the steps of a spec in a new note and returns the state written in the | notation. */
async function play(spec: BehaviourSpec): Promise<{ expected: string[]; actual: string[] }> {
	let editor: NoteEditor | null = null;
	const expected: string[] = [];
	const actual: string[] = [];
	for (const step of spec.steps) {
		if (step.kind === 'apply') {
			const marked = parseMarked(step.state);
			editor = await NoteEditor.open(app, marked.text);
			await editor.focus();
			await editor.select(marked.selection);
		} else if (step.kind === 'key') {
			const press = toKeyPress(step.shortcut);
			if (press) await app.pressKey(press.name, press.shift, press.control);
			await wait(60);
		} else if (step.kind === 'execute') {
			await editor?.runCommand(COMMANDS[step.command] ?? '');
			await wait(60);
		} else if (editor) {
			expected.push(step.state);
			const selection = (await editor.selections())[0];
			actual.push(selection ? renderMarked(await editor.text(), selection) : '');
		}
	}
	return { expected, actual };
}

for (const { file, settings } of SPEC_FILES) {
	const specs = parseSpecs(readFileSync(join(import.meta.dirname, 'specs', file), 'utf8'));
	describe(file.replace('.spec.md', ''), () => {
		for (const spec of specs.filter(isRunnable)) {
			it(spec.title, async () => {
				for (const [key, value] of Object.entries(settings)) {
					await app.evaluate(
						`(app.plugins.plugins["flow-outliner"].settings[${JSON.stringify(key)}] = ${String(value)}, true)`,
					);
				}
				const { expected, actual } = await play(spec);
				expect(actual).toEqual(expected);
			});
		}
	});
}

describe('the list of specs Flow does not match yet', () => {
	it('names only specs that exist in the copied files', () => {
		const titles = new Set(
			SPEC_FILES.flatMap(({ file }) =>
				parseSpecs(readFileSync(join(import.meta.dirname, 'specs', file), 'utf8')).map(
					(spec) => spec.title,
				),
			),
		);
		expect([...NOT_YET_MATCHING].filter((title) => !titles.has(title))).toEqual([]);
	});
});
