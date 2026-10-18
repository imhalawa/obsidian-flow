import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseMarked, renderMarked } from './support/marked-state';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';
import type { KeyName } from './support/obsidian-app';

interface KeyCase {
	title: string;
	setting: string | null;
	start: string;
	key: KeyName;
	shift: boolean;
	control: boolean;
	expected: string;
}

interface CommandCase {
	title: string;
	start: string;
	command: string;
	expected: string;
}

const KEY_CASES: KeyCase[] = [
	{
		title: 'Enter on an empty item two levels deep outdents it one level',
		setting: null,
		start: '- a\n\t- b\n\t\t- |',
		key: 'enter',
		shift: false,
		control: false,
		expected: '- a\n\t- b\n\t- |',
	},
	{
		title: 'Enter at the end of an item with children adds the first child',
		setting: null,
		start: '- a|\n\t- b',
		key: 'enter',
		shift: false,
		control: false,
		expected: '- a\n\t- |\n\t- b',
	},
	{
		title: 'Enter at the end of a task with task children adds a task child',
		setting: null,
		start: '- [ ] a|\n\t- [ ] b',
		key: 'enter',
		shift: false,
		control: false,
		expected: '- [ ] a\n\t- [ ] |\n\t- [ ] b',
	},
	{
		title: 'Backspace at the start of a nested item joins it to the item above',
		setting: null,
		start: '- one\n\t- |two',
		key: 'backspace',
		shift: false,
		control: false,
		expected: '- one|two',
	},
	{
		title: 'Home in a nested item stops at the start of its text',
		setting: null,
		start: '- a\n\t- bcd|',
		key: 'home',
		shift: false,
		control: false,
		expected: '- a\n\t- |bcd',
	},
	{
		title: 'Tab with the setting on indents the item together with its children',
		setting: 'tabIndentsItem',
		start: '- a\n- |b\n\t- c',
		key: 'tab',
		shift: false,
		control: false,
		expected: '- a\n\t- |b\n\t\t- c',
	},
	{
		title: 'Shift-Tab with the setting on outdents the item together with its children',
		setting: 'tabIndentsItem',
		start: '- a\n\t- |b\n\t\t- c',
		key: 'tab',
		shift: true,
		control: false,
		expected: '- a\n- |b\n\t- c',
	},
];

const COMMAND_CASES: CommandCase[] = [
	{
		title: 'indent-item moves the first item of a list nowhere',
		start: '- |a\n- b',
		command: 'indent-item',
		expected: '- |a\n- b',
	},
	{
		title: 'outdent-item leaves a top level item where it is',
		start: '- |a\n- b',
		command: 'outdent-item',
		expected: '- |a\n- b',
	},
	{
		title: 'move-item-up leaves the first item where it is',
		start: '- |a\n- b',
		command: 'move-item-up',
		expected: '- |a\n- b',
	},
	{
		title: 'move-item-down leaves the last item where it is',
		start: '- a\n- |b',
		command: 'move-item-down',
		expected: '- a\n- |b',
	},
	{
		title: 'indent-item carries the children of the item along',
		start: '- a\n- |b\n\t- c',
		command: 'indent-item',
		expected: '- a\n\t- |b\n\t\t- c',
	},
	{
		title: 'outdent-item carries the children of the item along',
		start: '- a\n\t- |b\n\t\t- c',
		command: 'outdent-item',
		expected: '- a\n- |b\n\t- c',
	},
	{
		title: 'move-item-up jumps over the previous item and its children',
		start: '- a\n\t- a1\n- |b',
		command: 'move-item-up',
		expected: '- |b\n- a\n\t- a1',
	},
	{
		title: 'move-item-down jumps over the next item and its children',
		start: '- |a\n- b\n\t- b1',
		command: 'move-item-down',
		expected: '- b\n\t- b1\n- |a',
	},
];

const PAUSE_MS = 60;

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
	await app.evaluate(
		'(app.vault.setConfig("useTab", true), app.vault.setConfig("tabSize", 4), true)',
	);
});

afterAll(async () => {
	await app.stop();
});

/** Opens a note written in the | notation and puts the caret or selection where it says. */
async function openMarked(marked: string): Promise<NoteEditor> {
	const state = parseMarked(marked);
	const editor = await NoteEditor.open(app, state.text);
	await editor.focus();
	await editor.select(state.selection);
	return editor;
}

/** Writes the text and first selection of the editor in the | notation. */
async function readMarked(editor: NoteEditor): Promise<string> {
	const selection = (await editor.selections())[0];
	return selection ? renderMarked(await editor.text(), selection) : '';
}

/** Sets or clears one boolean setting of the plugin. */
async function setSetting(key: string, value: boolean): Promise<void> {
	await app.evaluate(
		`(app.plugins.plugins["roamer"].settings[${JSON.stringify(key)}] = ${String(value)}, true)`,
	);
}

describe('list editing keys', () => {
	it.each(KEY_CASES)('$title', async (testCase) => {
		if (testCase.setting !== null) await setSetting(testCase.setting, true);
		const editor = await openMarked(testCase.start);
		await app.pressKey(testCase.key, testCase.shift, testCase.control);
		await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
		const actual = await readMarked(editor);
		if (testCase.setting !== null) await setSetting(testCase.setting, false);
		expect(actual).toBe(testCase.expected);
	});
});

describe('list editing commands', () => {
	it.each(COMMAND_CASES)('$title', async (testCase) => {
		const editor = await openMarked(testCase.start);
		await editor.runCommand(testCase.command);
		await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
		expect(await readMarked(editor)).toBe(testCase.expected);
	});
});
