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

	it('registers the zoom editor extension', async () => {
		const plugin = makePlugin();
		await plugin.onload();
		expect(
			(plugin as unknown as { editorExtensions: unknown[] }).editorExtensions,
		).toHaveLength(1);
	});

	it('renders an empty settings tab without throwing', async () => {
		const plugin = makePlugin();
		const tab = new FlowSettingTab({} as never, plugin);
		expect(() => tab.display()).not.toThrow();
	});
});
