import { Notice, Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { registerZoomMenu } from './commands/zoom-menu';
import { systemBlockLinkServices } from './commands/copy-item-link';
import { blockIdHiding } from './editor/block-id-hiding';
import { foldReveal } from './editor/fold-reveal';
import { ItemSuggest } from './editor/item-suggest';
import { registerItemDrag } from './editor/register-item-drag';
import { registerListKeys } from './editor/register-list-keys';
import { registerMouseHistory } from './editor/register-mouse-history';
import { registerItemPointer } from './editor/register-item-pointer';
import { registerZoom } from './editor/register-zoom';
import { threadHighlight } from './editor/thread-highlight';
import { registerZoomHeader } from './editor/zoom-header';
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
		registerZoomMenu(this);
		this.registerEditorExtension(blockIdHiding(() => this.settings.hideBlockIds));
		this.registerEditorExtension(foldReveal());
		this.registerEditorExtension(threadHighlight());
		this.registerEditorSuggest(
			new ItemSuggest(this.app, {
				isEnabled: () => this.settings.itemSuggester,
				random: () => Math.random(),
			}),
		);
		const beginDrag = registerItemDrag(
			this,
			{ dragItems: () => this.settings.dragItems },
			(message) => new Notice(message),
		);
		registerItemPointer(
			this,
			{
				clickBulletToZoom: () => this.settings.clickBulletToZoom,
				dragBullet: () => this.settings.dragItems,
				clickThreadLineToFold: () => this.settings.clickThreadLineToFold,
			},
			beginDrag,
			systemBlockLinkServices(),
		);
		registerListKeys(this, {
			enterOutdentsEmptyItem: () => this.settings.enterOutdentsEmptyItem,
			backspaceMergesItem: () => this.settings.backspaceMergesItem,
			homeStaysInItem: () => this.settings.homeStaysInItem,
			selectAllStaysInItem: () => this.settings.selectAllStaysInItem,
			tabIndentsItem: () => this.settings.tabIndentsItem,
		});
		registerMouseHistory(this, { isEnabled: () => this.settings.useMouseHistory });
		registerZoom(this, {
			rememberZoom: () => this.settings.rememberZoom,
			cleanZoom: () => this.settings.cleanZoom,
			notify: (message) => new Notice(message),
		});
		registerZoomHeader(this);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
