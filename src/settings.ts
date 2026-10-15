import { App, PluginSettingTab, Setting } from 'obsidian';
import type FlowPlugin from './main';

export interface FlowSettings {
	enabled: boolean;
	rememberZoom: boolean;
}

export const DEFAULT_SETTINGS: FlowSettings = {
	enabled: true,
	rememberZoom: true,
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
	}
}
