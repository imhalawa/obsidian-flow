import { App, PluginSettingTab } from 'obsidian';
import type FlowPlugin from './main';

export interface FlowSettings {
	enabled: boolean;
}

export const DEFAULT_SETTINGS: FlowSettings = {
	enabled: true,
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
	}
}
