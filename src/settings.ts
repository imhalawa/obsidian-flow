import { App, PluginSettingTab, Setting } from 'obsidian';
import type FlowPlugin from './main';

export interface FlowSettings {
	enabled: boolean;
	rememberZoom: boolean;
	hideBlockIds: boolean;
}

export const DEFAULT_SETTINGS: FlowSettings = {
	enabled: true,
	rememberZoom: true,
	hideBlockIds: true,
};

export class FlowSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: FlowPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName('Remember zoom per note')
			.setDesc('Reopen each note at the item you zoomed into.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.rememberZoom).onChange(async (value) => {
					this.plugin.settings.rememberZoom = value;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(this.containerEl)
			.setName('Hide block ids')
			.setDesc('Hide the id at the end of an item unless the cursor is on its line.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.hideBlockIds).onChange(async (value) => {
					this.plugin.settings.hideBlockIds = value;
					await this.plugin.saveSettings();
					this.app.workspace.updateOptions();
				}),
			);
	}
}
