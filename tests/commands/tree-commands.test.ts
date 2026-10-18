import { beforeEach, describe, expect, it } from 'vitest';
import { Notice, Plugin } from '../mocks/obsidian';
import { registerCommands } from '../../src/commands';
import { FakeEditor } from '../support/fake-editor';

const caret = (line: number, ch: number) => ({ anchor: { line, ch }, head: { line, ch } });

const commandsOf = () => {
	const plugin = new Plugin();
	registerCommands(plugin as never);
	return new Map(plugin.commands.map((command) => [command.id, command]));
};

const run = (id: string, editor: FakeEditor, checking: boolean) =>
	commandsOf().get(id)?.editorCheckCallback?.(checking, editor, {});

beforeEach(() => {
	Notice.shown.length = 0;
});

describe('tree commands', () => {
	it('registers stable ids and sentence case names', () => {
		const commands = [...commandsOf().values()].map(({ id, name }) => [id, name]);
		expect(commands).toEqual([
			['indent-item', 'Indent item'],
			['outdent-item', 'Outdent item'],
			['move-item-up', 'Move item up'],
			['move-item-down', 'Move item down'],
			['zoom-in', 'Zoom in'],
			['zoom-out', 'Zoom out'],
			['zoom-reset', 'Show the whole note'],
			['zoom-history-back', 'Zoom back'],
			['zoom-history-forward', 'Zoom forward'],
			['fold-item', 'Fold item'],
			['unfold-item', 'Unfold item'],
			['fold-all', 'Fold all items'],
			['unfold-all', 'Unfold all items'],
		]);
	});

	it.each(['indent-item', 'outdent-item', 'move-item-up', 'move-item-down'])(
		'%s is available only on a list item',
		(id) => {
			expect(run(id, new FakeEditor('- a', [caret(0, 0)]), true)).toBe(true);
			expect(run(id, new FakeEditor('text', [caret(0, 0)]), true)).toBe(false);
		},
	);

	it('does not touch the note while checking', () => {
		const editor = new FakeEditor('- a\n- b', [caret(1, 0)]);
		run('indent-item', editor, true);
		expect(editor.text).toBe('- a\n- b');
	});

	it.each([
		['indent-item', '- a\n- b', caret(1, 0), '- a\n\t- b'],
		['outdent-item', '- a\n  - b', caret(1, 2), '- a\n- b'],
		['move-item-up', '- a\n- b', caret(1, 0), '- b\n- a'],
		['move-item-down', '- a\n- b', caret(0, 0), '- b\n- a'],
	])('%s edits the note', (id, text, selection, expected) => {
		const editor = new FakeEditor(text, [selection]);
		run(id, editor, false);
		expect(editor.text).toBe(expected);
	});

	it.each(['indent-item', 'outdent-item', 'move-item-up', 'move-item-down'])(
		'%s reports that it handled the command',
		(id) => {
			expect(run(id, new FakeEditor('- a\n  - b\n- c', [caret(1, 2)]), false)).toBe(true);
		},
	);

	it('indents several selected items from the top down', () => {
		const editor = new FakeEditor('- p\n- a\n- b', [
			{ anchor: { line: 1, ch: 0 }, head: { line: 2, ch: 3 } },
		]);
		run('indent-item', editor, false);
		expect(editor.text).toBe('- p\n\t- a\n\t- b');
	});

	it('moves several selected items up from the top down', () => {
		const editor = new FakeEditor('- p\n- a\n- b', [
			{ anchor: { line: 1, ch: 0 }, head: { line: 2, ch: 3 } },
		]);
		run('move-item-up', editor, false);
		expect(editor.text).toBe('- a\n- b\n- p');
	});

	it('moves several selected items down from the bottom up', () => {
		const editor = new FakeEditor('- a\n- b\n- p', [
			{ anchor: { line: 0, ch: 0 }, head: { line: 1, ch: 3 } },
		]);
		run('move-item-down', editor, false);
		expect(editor.text).toBe('- p\n- a\n- b');
	});

	it('shows a notice and leaves the note alone when refused', () => {
		const editor = new FakeEditor('- a\n- b', [caret(0, 0)]);
		run('move-item-up', editor, false);
		expect(editor.text).toBe('- a\n- b');
		expect(Notice.shown).toEqual(['This item is the first one at its level.']);
	});

	it('shows no notice when the edit works', () => {
		run('indent-item', new FakeEditor('- a\n- b', [caret(1, 0)]), false);
		expect(Notice.shown).toEqual([]);
	});
});
