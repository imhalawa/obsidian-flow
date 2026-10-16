import { describe, expect, it } from 'vitest';
import FlowPlugin from '../src/main';
import { DEFAULT_SETTINGS, FlowSettingTab } from '../src/settings';
import { FakeApp } from './support/fake-app';

const makePlugin = () => new FlowPlugin(new FakeApp() as never, {} as never);

describe('FlowPlugin lifecycle', () => {
	it('loads defaults when nothing is stored', async () => {
		const plugin = makePlugin();
		await plugin.onload();
		expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
	});

	it('merges stored settings over defaults', async () => {
		const plugin = makePlugin();
		await plugin.saveData({ enabled: false });
		await plugin.onload();
		expect(plugin.settings.enabled).toBe(false);
	});

	it('persists settings', async () => {
		const plugin = makePlugin();
		await plugin.onload();
		plugin.settings.enabled = false;
		await plugin.saveSettings();
		expect(await plugin.loadData()).toEqual({ ...DEFAULT_SETTINGS, enabled: false });
	});

	it('registers the settings tab', async () => {
		const plugin = makePlugin();
		await plugin.onload();
		expect((plugin as unknown as { settingTabs: unknown[] }).settingTabs).toHaveLength(1);
	});

	it('registers the block id hiding, fold reveal, thread highlight, item pointer, drag, list keys, zoom and zoom path editor extensions', async () => {
		const plugin = makePlugin();
		await plugin.onload();
		expect(
			(plugin as unknown as { editorExtensions: unknown[] }).editorExtensions,
		).toHaveLength(8);
	});

	it('registers the item suggester', async () => {
		const plugin = makePlugin();
		await plugin.onload();
		expect((plugin as unknown as { editorSuggests: unknown[] }).editorSuggests).toHaveLength(1);
	});

	it('wraps the history of the main window and restores it on unload', async () => {
		const app = new FakeApp();
		const original = app.mainWindow.history.back;
		const plugin = new FlowPlugin(app as never, {} as never);
		await plugin.onload();
		expect(app.mainWindow.history.back).not.toBe(original);
		for (const cleanup of (plugin as unknown as { cleanups: (() => void)[] }).cleanups)
			cleanup();
		expect(app.mainWindow.history.back).toBe(original);
	});

	it('renders an empty settings tab without throwing', async () => {
		const plugin = makePlugin();
		const tab = new FlowSettingTab({} as never, plugin);
		expect(() => tab.display()).not.toThrow();
	});
});
