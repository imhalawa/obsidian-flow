import { EditorState } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerZoom } from '../../src/editor/register-zoom';
import { zoomChange } from '../../src/editor/zoom-field';
import { Plugin } from '../mocks/obsidian';
import { FakeApp } from '../support/fake-app';

const anchor = [{ text: 'a', nth: 0 }];
const KEY = 'flow-outliner-zoom';

let app: FakeApp;
let plugin: Plugin;
let remember: boolean;
let notices: string[];

const register = (target: FakeApp, host: { remember: () => boolean }) => {
	const owner = new Plugin(target);
	const memory = registerZoom(owner as never, {
		rememberZoom: host.remember,
		notify: (message) => notices.push(message),
	});
	return { owner, memory };
};

beforeEach(() => {
	app = new FakeApp();
	remember = true;
	notices = [];
	const registered = register(app, { remember: () => remember });
	plugin = registered.owner;
});

describe('registerZoom', () => {
	it('registers the zoom and persistence extensions as one editor extension', () => {
		expect(plugin.editorExtensions).toHaveLength(1);
		expect(plugin.editorExtensions[0]).toHaveLength(2);
	});

	it('listens to renames and deletes of notes', () => {
		expect(plugin.events).toHaveLength(2);
		expect([...app.handlers.keys()].sort()).toEqual(['delete', 'rename']);
	});

	it('moves what is remembered when a note is renamed', () => {
		const fresh = new FakeApp();
		fresh.storage.set(KEY, { 'old.md': { anchor, usedAt: 1 } });
		register(fresh, { remember: () => true });
		fresh.handlers.get('rename')?.({ path: 'new.md' }, 'old.md');
		expect(Object.keys(fresh.storage.get(KEY) as object)).toEqual(['new.md']);
	});

	it('forgets a note when it is deleted', () => {
		const fresh = new FakeApp();
		fresh.storage.set(KEY, { 'gone.md': { anchor, usedAt: 1 } });
		register(fresh, { remember: () => true });
		fresh.handlers.get('delete')?.({ path: 'gone.md' }, '');
		expect(fresh.storage.get(KEY)).toEqual({});
	});

	it('writes nothing until something changes', () => {
		expect(app.storage.has(KEY)).toBe(false);
	});

	it('stores what it remembers under one key in the app storage with the current time', () => {
		const { memory } = register(app, { remember: () => true });
		vi.useFakeTimers();
		vi.setSystemTime(5000);
		memory.remember('a.md', anchor);
		vi.useRealTimers();
		expect(app.storage.get(KEY)).toEqual({ 'a.md': { anchor, usedAt: 5000 } });
	});

	it('asks the host whether remembering is switched on', () => {
		const { memory } = register(app, { remember: () => remember });
		expect(memory.enabled()).toBe(true);
		remember = false;
		expect(memory.enabled()).toBe(false);
	});

	it('tells the host when a zoomed item is removed', () => {
		const state = EditorState.create({
			doc: '- a\n- b',
			extensions: plugin.editorExtensions as never,
		});
		const zoomed = state.update({
			effects: zoomChange.of({ startLine: 1, navigation: 'visit' }),
		}).state;
		const transaction = zoomed.update({ changes: { from: 4, to: 5, insert: 'x' } });
		const update = {
			startState: zoomed,
			state: transaction.state,
			transactions: [transaction],
		} as unknown as ViewUpdate;
		for (const listener of zoomed.facet(EditorView.updateListener)) listener(update);
		expect(notices).toEqual(['Zoomed item was removed. Showing the full note.']);
	});
});
