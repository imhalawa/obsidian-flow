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
	return plugin;
};

describe('settings tab', () => {
	it('offers a sentence case toggle to remember zoom per note', async () => {
		await showTab();
		expect(Setting.created.map((setting) => setting.name)).toEqual(['Remember zoom per note']);
		expect(Setting.created[0]?.description).toBe(
			'Reopen each note at the item you zoomed into.',
		);
	});

	it('shows the current value', async () => {
		const plugin = await showTab();
		expect(Setting.created[0]?.toggle?.value).toBe(plugin.settings.rememberZoom);
	});

	it('saves the value when the toggle changes', async () => {
		const plugin = await showTab();
		await Setting.created[0]?.toggle?.handler?.(false);
		expect(plugin.settings.rememberZoom).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ rememberZoom: false });
	});
});
