import { beforeEach, describe, expect, it } from 'vitest';
import {
	COPIED_MESSAGE,
	COPY_FAILED_MESSAGE,
	DUPLICATE_ID_MESSAGE,
	registerCopyItemLink,
} from '../../src/commands/copy-item-link';
import { Notice, Plugin } from '../mocks/obsidian';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['- a', '- b ^taken'].join('\n');
const FILE = { path: 'folder/note.md' };

interface LinkCall {
	file: unknown;
	sourcePath: string;
	subpath: string;
}

let linkCalls: LinkCall[];
let copied: string[];
let copyFails: boolean;

const setup = () => {
	const plugin = new Plugin({
		fileManager: {
			generateMarkdownLink: (file: unknown, sourcePath: string, subpath: string) => {
				linkCalls.push({ file, sourcePath, subpath });
				return `[[note${subpath}]]`;
			},
		},
	});
	registerCopyItemLink(plugin as never, {
		random: () => 0.5,
		copy: (text) => {
			copied.push(text);
			return copyFails ? Promise.reject(new Error('denied')) : Promise.resolve();
		},
	});
	const command = plugin.commands[0];
	return {
		command,
		run: (target: FakeZoomTarget, file: unknown, checking: boolean) =>
			command?.editorCheckCallback?.(checking, { cm: target }, { file }),
	};
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	Notice.shown.length = 0;
	linkCalls = [];
	copied = [];
	copyFails = false;
});

describe('copy-item-link', () => {
	it('registers a stable id and a sentence case name', () => {
		const { command } = setup();
		expect([command?.id, command?.name]).toEqual(['copy-item-link', 'Copy link to item']);
	});

	it('is unavailable without the zoom extension or without a file', () => {
		const { command, run } = setup();
		expect(command?.editorCheckCallback?.(true, {}, { file: FILE })).toBe(false);
		expect(run(new FakeZoomTarget(NOTE, 0), null, true)).toBe(false);
	});

	it('is available in a note and does not change it while checking', () => {
		const { run } = setup();
		const target = new FakeZoomTarget(NOTE, 0);
		expect(run(target, FILE, true)).toBe(true);
		expect(target.text).toBe(NOTE);
	});

	it('adds an id, copies a link to it and says so', async () => {
		const { run } = setup();
		const target = new FakeZoomTarget(NOTE, 0);
		expect(run(target, FILE, false)).toBe(true);
		await settle();
		expect(target.text).toBe('- a ^i00000\n- b ^taken');
		expect(linkCalls).toEqual([{ file: FILE, sourcePath: '', subpath: '#^i00000' }]);
		expect(copied).toEqual(['[[note#^i00000]]']);
		expect(Notice.shown).toEqual([COPIED_MESSAGE]);
	});

	it('reuses the id an item already has', async () => {
		const { run } = setup();
		const target = new FakeZoomTarget(NOTE, NOTE.indexOf('b'));
		run(target, FILE, false);
		await settle();
		expect(target.text).toBe(NOTE);
		expect(copied).toEqual(['[[note#^taken]]']);
	});

	it('warns when the id is used more than once', async () => {
		const { run } = setup();
		const target = new FakeZoomTarget('- a ^x\n- b ^x', 0);
		run(target, FILE, false);
		await settle();
		expect(Notice.shown).toContain(DUPLICATE_ID_MESSAGE);
	});

	it('explains when the clipboard refuses the link', async () => {
		copyFails = true;
		const { run } = setup();
		run(new FakeZoomTarget(NOTE, 0), FILE, false);
		await settle();
		expect(Notice.shown).toEqual([COPY_FAILED_MESSAGE]);
	});

	it('asks for a list item and copies nothing when the cursor is not in one', async () => {
		const { run } = setup();
		const target = new FakeZoomTarget('text\n- a', 1);
		expect(run(target, FILE, false)).toBe(true);
		await settle();
		expect(Notice.shown).toEqual(['Place the cursor in a list item.']);
		expect(copied).toEqual([]);
	});
});
