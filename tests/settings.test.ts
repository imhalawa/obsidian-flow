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
			'Show the zoomed item at the left edge',
			'Hide block ids',
			'Suggest items after ((',
			'Hide embed titles in bullets',
			'Bullets and thread lines',
			'Click bullet to zoom',
			'Click thread line to fold',
			'Use mouse back and forward for zoom',
			'Drag items by their bullet',
			'List editing',
			'Enter on an empty item outdents it',
			'Enter on an item with children adds its first child',
			'Backspace at the start of an item merges it',
			'Home stays inside the item text',
			'Select all starts with the item text',
			'Tab and Shift-Tab move whole items',
		]);
	});

	it('describes each setting', async () => {
		await showTab();
		expect(Setting.created.map((setting) => setting.description)).toEqual([
			'Reopen each note at the item you zoomed into.',
			'Move the zoomed item to the left edge of the note and hide the indent guides of the levels above it.',
			'Hide the id at the end of an item unless the cursor is on its line.',
			'Type (( to search the items of your notes and insert a link to one.',
			'Hide the title bar of a note embedded in a bullet, so the bullet lines up with the first line of the embed.',
			'',
			'Select a bullet to zoom into that item.',
			'Select a thread line to fold its branch. Hold Alt to fold every descendant too.',
			"Step through zoom levels first. When none are left, Obsidian's own back and forward apply.",
			'Press a bullet and move to drag the item and its children, also to another open note. A click on the bullet still zooms.',
			'',
			'Outdent an empty item, or end the list when it is at the top level.',
			'Add the new item as the first child, as a task when the first child is a task, instead of between the item and its children.',
			'Join the item with the one above instead of deleting the bullet.',
			'Move to the start of the item text before moving to the start of the line.',
			'Select the text of the item first. Select all again to select the whole note.',
			'Indent and outdent the item with its children. Turn this on to replace the editor keys.',
		]);
	});

	it('shows the current values', async () => {
		const { plugin } = await showTab();
		expect(Setting.created.map((setting) => setting.toggle?.value)).toEqual([
			plugin.settings.rememberZoom,
			plugin.settings.cleanZoom,
			plugin.settings.hideBlockIds,
			plugin.settings.itemSuggester,
			plugin.settings.hideEmbedTitles,
			undefined,
			plugin.settings.clickBulletToZoom,
			plugin.settings.clickThreadLineToFold,
			plugin.settings.useMouseHistory,
			plugin.settings.dragItems,
			undefined,
			plugin.settings.enterOutdentsEmptyItem,
			plugin.settings.enterAddsFirstChild,
			plugin.settings.backspaceMergesItem,
			plugin.settings.homeStaysInItem,
			plugin.settings.selectAllStaysInItem,
			plugin.settings.tabIndentsItem,
		]);
	});

	it('saves remember zoom when its toggle changes', async () => {
		const { plugin } = await showTab();
		await Setting.created[0]?.toggle?.handler?.(false);
		expect(plugin.settings.rememberZoom).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ rememberZoom: false });
	});

	it('saves show the zoomed item at the left edge and refreshes the editors when its toggle changes', async () => {
		const { app, plugin } = await showTab();
		await Setting.created[1]?.toggle?.handler?.(false);
		expect(plugin.settings.cleanZoom).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ cleanZoom: false });
		expect(app.updateOptionsCalls).toBe(1);
	});

	it('saves hide block ids and refreshes the editors when its toggle changes', async () => {
		const { app, plugin } = await showTab();
		await Setting.created[2]?.toggle?.handler?.(false);
		expect(plugin.settings.hideBlockIds).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ hideBlockIds: false });
		expect(app.updateOptionsCalls).toBe(1);
	});

	it('saves the item suggester setting when its toggle changes', async () => {
		const { plugin } = await showTab();
		await Setting.created[3]?.toggle?.handler?.(false);
		expect(plugin.settings.itemSuggester).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ itemSuggester: false });
	});

	it('saves hide embed titles in bullets and refreshes the editors when its toggle changes', async () => {
		const { app, plugin } = await showTab();
		expect(plugin.settings.hideEmbedTitles).toBe(true);
		await Setting.created[4]?.toggle?.handler?.(false);
		expect(plugin.settings.hideEmbedTitles).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ hideEmbedTitles: false });
		expect(app.updateOptionsCalls).toBe(1);
	});

	it('saves click bullet to zoom when its toggle changes', async () => {
		const { plugin } = await showTab();
		await Setting.created[6]?.toggle?.handler?.(false);
		expect(plugin.settings.clickBulletToZoom).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ clickBulletToZoom: false });
	});

	it('saves click thread line to fold when its toggle changes', async () => {
		const { plugin } = await showTab();
		await Setting.created[7]?.toggle?.handler?.(false);
		expect(plugin.settings.clickThreadLineToFold).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ clickThreadLineToFold: false });
	});

	it('saves use mouse back and forward for zoom when its toggle changes', async () => {
		const { plugin } = await showTab();
		await Setting.created[8]?.toggle?.handler?.(false);
		expect(plugin.settings.useMouseHistory).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ useMouseHistory: false });
	});

	it.each([
		[10 + 1, 'enterOutdentsEmptyItem', true],
		[10 + 3, 'backspaceMergesItem', true],
		[10 + 4, 'homeStaysInItem', true],
		[10 + 5, 'selectAllStaysInItem', true],
		[10 + 6, 'tabIndentsItem', false],
		[10 + 2, 'enterAddsFirstChild', true],
	] as const)(
		'saves list editing setting %i (%s) when its toggle changes',
		async (index, key, initial) => {
			const { plugin } = await showTab();
			expect(plugin.settings[key]).toBe(initial);
			await Setting.created[index]?.toggle?.handler?.(!initial);
			expect(plugin.settings[key]).toBe(!initial);
			expect(await plugin.loadData()).toMatchObject({ [key]: !initial });
		},
	);

	it('saves drag items and refreshes the editors when its toggle changes', async () => {
		const { app, plugin } = await showTab();
		await Setting.created[9]?.toggle?.handler?.(false);
		expect(plugin.settings.dragItems).toBe(false);
		expect(await plugin.loadData()).toMatchObject({ dragItems: false });
		expect(app.updateOptionsCalls).toBe(1);
	});
});
