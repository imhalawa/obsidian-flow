import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, FlowSettings, FlowSettingTab } from './settings';

export default class FlowPlugin extends Plugin {
	settings: FlowSettings = { ...DEFAULT_SETTINGS };

	async onload() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<FlowSettings> | null,
		);
		this.addSettingTab(new FlowSettingTab(this.app, this));
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
