import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
});

afterAll(async () => {
	await app.stop();
});

const OPEN_TAB = `(async () => {
	app.setting.open();
	app.setting.openTabById("roamer");
	await new Promise((resolve) => setTimeout(resolve, 300));
	return true;
})()`;

describe('settings tab in real Obsidian', () => {
	it('shows one switch for each setting', async () => {
		await app.evaluate(OPEN_TAB);
		const count = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".vertical-tab-content .checkbox-container").length',
		);
		expect(count).toBe(16);
	});

	it('saves a switch that is turned off', async () => {
		await app.evaluate(OPEN_TAB);
		await app.evaluate(
			'activeDocument.querySelector(".vertical-tab-content .checkbox-container").click()',
		);
		await new Promise((resolve) => setTimeout(resolve, 200));
		const stored = await app.evaluate<boolean>(
			'app.plugins.plugins["roamer"].settings.rememberZoom',
		);
		expect(stored).toBe(false);
		await app.evaluate('app.plugins.plugins["roamer"].settings.rememberZoom = true');
	});

	it('lists the headings of its groups', async () => {
		await app.evaluate(OPEN_TAB);
		const headings = await app.evaluate<string[]>(
			'Array.from(activeDocument.querySelectorAll(".vertical-tab-content .setting-item-heading .setting-item-name")).map((el) => el.textContent)',
		);
		expect(headings).toEqual(['Bullets and thread lines', 'List editing']);
	});
});
