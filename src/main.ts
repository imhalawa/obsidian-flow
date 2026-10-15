import { Notice, Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { zoomExtension } from './editor/zoom-extension';
import { DEFAULT_SETTINGS, FlowSettings, FlowSettingTab } from './settings';
import { ZOOM_REMOVED_MESSAGE } from './ui/zoom-messages';

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
		this.registerEditorExtension(zoomExtension(() => new Notice(ZOOM_REMOVED_MESSAGE)));
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
