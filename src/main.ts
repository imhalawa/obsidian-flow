import { Notice, Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { systemBlockLinkServices } from './commands/copy-item-link';
import { blockIdHiding } from './editor/block-id-hiding';
import { ItemSuggest } from './editor/item-suggest';
import { registerMouseHistory } from './editor/register-mouse-history';
import { registerItemPointer } from './editor/register-item-pointer';
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
		this.registerEditorExtension(blockIdHiding(() => this.settings.hideBlockIds));
		this.registerEditorSuggest(
			new ItemSuggest(this.app, {
				isEnabled: () => this.settings.itemSuggester,
				random: () => Math.random(),
			}),
		);
		registerItemPointer(
			this,
			{
				clickBulletToZoom: () => this.settings.clickBulletToZoom,
				clickThreadLineToFold: () => this.settings.clickThreadLineToFold,
			},
			systemBlockLinkServices(),
		);
		registerMouseHistory(this, { isEnabled: () => this.settings.useMouseHistory });
		registerZoom(this, {
			rememberZoom: () => this.settings.rememberZoom,
			notify: (message) => new Notice(message),
		});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
