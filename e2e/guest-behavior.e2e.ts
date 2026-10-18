import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseMarked, renderMarked } from './support/marked-state';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp, type KeyName } from './support/obsidian-app';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
	await app.evaluate(
		'(app.plugins.plugins["roamer"].settings.keepBulletOutOfSelection = false, app.workspace.updateOptions(), true)',
	);
});

afterAll(async () => {
	await app.stop();
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Action = KeyName | 'type';

/** Plays one action in a new note and returns the note in the | notation. */
async function play(state: string, action: Action, shift: boolean): Promise<string> {
	const marked = parseMarked(state);
	const editor = await NoteEditor.open(app, marked.text);
	await editor.focus();
	await editor.select(marked.selection);
	if (action === 'type') await app.typeText('x');
	else await app.pressKey(action, shift, false);
	await wait(60);
	const selection = (await editor.selections())[0];
	return selection ? renderMarked(await editor.text(), selection) : '';
}

/** Results that Obsidian gives without the plugin, which the plugin must leave as they are; the suite turns the bullet setting off, because that setting deliberately keeps the cursor out of a marker. */
const NATIVE_RESULTS: [string, string, Action, boolean, string][] = [
	['typing in a list item', '- one|', 'type', false, '- onex|'],
	['typing in a heading', '# head|', 'type', false, '# headx|'],
	['Enter at the end of a heading', '# head|', 'enter', false, '# head\n|'],
	['Enter at the end of a paragraph', 'para|', 'enter', false, 'para\n|'],
	['Enter in the middle of a list item', '- on|e', 'enter', false, '- on\n- |e'],
	[
		'Enter at the end of a nested item',
		'- one\n\t- two|',
		'enter',
		false,
		'- one\n\t- two\n\t- |',
	],
	['Enter at the end of an ordered item', '1. one|', 'enter', false, '1. one\n2. |'],
	['Enter at the end of a task', '- [ ] one|', 'enter', false, '- [ ] one\n- [ ] |'],
	['Shift-Enter in a list item', '- one|', 'enter', true, '- one\n  |'],
	['Backspace in the middle of a list item', '- one\n- tw|o', 'backspace', false, '- one\n- t|o'],
	['Backspace after a bullet marker', '- one\n-| two', 'backspace', false, '- one\n| two'],
	['Backspace in a paragraph', '- one\n\npara|', 'backspace', false, '- one\n\npar|'],
	['Home in a list item', '- one|', 'home', false, '- |one'],
	['Home in a nested list item', '  - one|', 'home', false, '  - |one'],
	['Shift-Home in a list item', '- one|', 'home', true, '- |one|'],
	['Tab in a nested list item', '- one\n\t- tw|o', 'tab', false, '- one\n\t\t- tw|o'],
	['Tab in a list item', '- one\n- tw|o', 'tab', false, '- one\n\t- tw|o'],
	['Tab in an empty list item', '- one\n- |', 'tab', false, '- one\n\t- |'],
	['Shift-Tab in a nested list item', '- one\n\t- tw|o', 'tab', true, '- one\n- tw|o'],
	['Shift-Tab in a top level list item', '- one\n- tw|o', 'tab', true, '- one\n- tw|o'],
];

describe('Obsidian behavior that the plugin leaves alone', () => {
	it.each(NATIVE_RESULTS)('%s', async (_description, state, action, shift, expected) => {
		expect(await play(state, action, shift)).toBe(expected);
	});
});
