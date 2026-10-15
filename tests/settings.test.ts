import { beforeEach, describe, expect, it } from 'vitest';
import FlowPlugin from '../src/main';
import { FlowSettingTab } from '../src/settings';
import { Setting } from './mocks/obsidian';
import { FakeApp } from './support/fake-app';

beforeEach(() => {
	Setting.created.length = 0;
});

const showTab = async () => {
	const app = new FakeApp();
	const plugin = new FlowPlugin(app as never, {} as never);
	await plugin.onload();
	new FlowSettingTab(app as never, plugin).display();
	return { app, plugin };
};

describe('settings tab', () => {
	it('lists its settings in sentence case', async () => {
		await showTab();
		expect(Setting.created.map((setting) => setting.name)).toEqual([
			'Remember zoom per note',
			'Hide block ids',
		]);
	});

	it('describes each setting', async () => {
		await showTab();
		expect(Setting.created.map((setting) => setting.description)).toEqual([
			'Reopen each note at the item you zoomed into.',
			'Hide the id at the end of an item unless the cursor is on its line.',
		]);
	});

	it('shows the current values', async () => {
		const { plugin } = await showTab();
		expect(Setting.created.map((setting) => setting.toggle?.value)).toEqual([
			plugin.settings.rememberZoom,
			plugin.settings.hideBlockIds,
		]);
	});

	it('saves remember zoom when its toggle changes', async () => {
		const { plugin } = await showTab();
		await Setting.created[0]?.toggle?.handler?.(false);
		expect(plugin.settings.rememberZoom).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ rememberZoom: false });
	});

	it('saves hide block ids and refreshes the editors when its toggle changes', async () => {
		const { app, plugin } = await showTab();
		await Setting.created[1]?.toggle?.handler?.(false);
		expect(plugin.settings.hideBlockIds).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ hideBlockIds: false });
		expect(app.updateOptionsCalls).toBe(1);
	});
});
