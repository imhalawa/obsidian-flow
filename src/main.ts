import { Notice, Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { registerZoomMenu } from './commands/zoom-menu';
import { bulletLight } from './editor/bullet-light-field';
import { bulletCallouts } from './editor/callout-bullets';
import { CalloutWidget, layoutCallouts } from './editor/callout-widget';
import { embedLines } from './editor/embed-lines';
import { foldReveal } from './editor/fold-reveal';
import { indentSpacing } from './editor/indent-spacing';
import { registerItemDrag } from './editor/register-item-drag';
import { registerListKeys } from './editor/register-list-keys';
import { registerMouseHistory } from './editor/register-mouse-history';
import { registerItemPointer } from './editor/register-item-pointer';
import { registerZoom } from './editor/register-zoom';
import { registerZoomPanel } from './editor/register-zoom-panel';
import { threadHighlight } from './editor/thread-highlight';
import { DEFAULT_SETTINGS, RoamerSettings, RoamerSettingTab, mergeSettings } from './settings';

export default class RoamerPlugin extends Plugin {
	settings: RoamerSettings = { ...DEFAULT_SETTINGS };

	async onload() {
		this.settings = mergeSettings(await this.loadData());
		this.addSettingTab(new RoamerSettingTab(this.app, this));
		registerCommands(this);
		registerZoomMenu(this);
		this.registerEditorExtension(indentSpacing(() => this.settings.fixedIndentSpacing));
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
		registerZoomPanel(this);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
