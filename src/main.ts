import { Notice, Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { registerZoomMenu } from './commands/zoom-menu';
import { systemBlockLinkServices } from './commands/copy-item-link';
import { bulletLight } from './editor/bullet-light-field';
import { blockIdHiding } from './editor/block-id-hiding';
import { bulletCallouts } from './editor/callout-bullets';
import { CalloutWidget, layoutCallouts } from './editor/callout-widget';
import { embedLines } from './editor/embed-lines';
import { foldReveal } from './editor/fold-reveal';
import { registerItemDrag } from './editor/register-item-drag';
import { registerListKeys } from './editor/register-list-keys';
import { registerMouseHistory } from './editor/register-mouse-history';
import { registerItemPointer } from './editor/register-item-pointer';
import { registerZoom } from './editor/register-zoom';
import { threadHighlight } from './editor/thread-highlight';
import { registerZoomHeader } from './editor/zoom-header';
import { DEFAULT_SETTINGS, FlowSettings, FlowSettingTab, mergeSettings } from './settings';

export default class FlowPlugin extends Plugin {
	settings: FlowSettings = { ...DEFAULT_SETTINGS };

	async onload() {
		this.settings = mergeSettings(await this.loadData());
		this.addSettingTab(new FlowSettingTab(this.app, this));
		registerCommands(this);
		registerZoomMenu(this);
		this.registerEditorExtension(blockIdHiding(() => this.settings.hideBlockIds));
		this.registerEditorExtension(foldReveal());
		this.registerEditorExtension(threadHighlight());
		this.registerEditorExtension(bulletLight());
		this.registerEditorExtension(embedLines(() => this.settings.hideEmbedTitles));
		this.registerEditorExtension(
			bulletCallouts(
				() => this.settings.bulletCallouts,
				(markdown) => new CalloutWidget(markdown, this.app),
				layoutCallouts,
			),
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
			enterAddsFirstChild: () => this.settings.enterAddsFirstChild,
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
