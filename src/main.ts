import { Notice, Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { registerZoom } from './editor/register-zoom';
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
		registerCommands(this);
		registerZoom(this, {
			rememberZoom: () => this.settings.rememberZoom,
			notify: (message) => new Notice(message),
		});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
