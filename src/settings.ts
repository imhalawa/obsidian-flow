import { App, PluginSettingTab, Setting } from 'obsidian';
import type FlowPlugin from './main';

export interface FlowSettings {
	enabled: boolean;
	rememberZoom: boolean;
	hideBlockIds: boolean;
	itemSuggester: boolean;
	clickBulletToZoom: boolean;
	clickThreadLineToFold: boolean;
	useMouseHistory: boolean;
}

export const DEFAULT_SETTINGS: FlowSettings = {
	enabled: true,
	rememberZoom: true,
	hideBlockIds: true,
	itemSuggester: true,
	clickBulletToZoom: true,
	clickThreadLineToFold: true,
	useMouseHistory: true,
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
		new Setting(this.containerEl)
			.setName('Suggest items after ((')
			.setDesc('Type (( to search the items of your notes and insert a link to one.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.itemSuggester).onChange(async (value) => {
					this.plugin.settings.itemSuggester = value;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(this.containerEl).setName('Bullets and thread lines').setHeading();
		new Setting(this.containerEl)
			.setName('Click bullet to zoom')
			.setDesc('Select a bullet to zoom into that item.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.clickBulletToZoom).onChange(async (value) => {
					this.plugin.settings.clickBulletToZoom = value;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(this.containerEl)
			.setName('Click thread line to fold')
			.setDesc(
				'Select a thread line to fold its branch. Hold Alt to fold every descendant too.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.clickThreadLineToFold)
					.onChange(async (value) => {
						this.plugin.settings.clickThreadLineToFold = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(this.containerEl)
			.setName('Use mouse back and forward for zoom')
			.setDesc(
				"Step through zoom levels first. When none are left, Obsidian's own back and forward apply.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useMouseHistory).onChange(async (value) => {
					this.plugin.settings.useMouseHistory = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
