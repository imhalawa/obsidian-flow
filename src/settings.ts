import { App, PluginSettingTab, Setting } from 'obsidian';
import type FlowPlugin from './main';

export interface FlowSettings {
	rememberZoom: boolean;
	cleanZoom: boolean;
	hideBlockIds: boolean;
	hideEmbedTitles: boolean;
	itemSuggester: boolean;
	clickBulletToZoom: boolean;
	clickThreadLineToFold: boolean;
	useMouseHistory: boolean;
	dragItems: boolean;
	enterOutdentsEmptyItem: boolean;
	backspaceMergesItem: boolean;
	homeStaysInItem: boolean;
	selectAllStaysInItem: boolean;
	tabIndentsItem: boolean;
}

export const DEFAULT_SETTINGS: FlowSettings = {
	rememberZoom: true,
	cleanZoom: true,
	hideBlockIds: true,
	hideEmbedTitles: true,
	itemSuggester: true,
	clickBulletToZoom: true,
	clickThreadLineToFold: true,
	useMouseHistory: true,
	dragItems: true,
	enterOutdentsEmptyItem: true,
	backspaceMergesItem: true,
	homeStaysInItem: true,
	selectAllStaysInItem: true,
	tabIndentsItem: false,
};

type ToggleKey = {
	[Key in keyof FlowSettings]: FlowSettings[Key] extends boolean ? Key : never;
}[keyof FlowSettings];

/** Returns the defaults with every stored value that is a boolean laid over them. */
export function mergeSettings(stored: unknown): FlowSettings {
	const merged = { ...DEFAULT_SETTINGS };
	if (typeof stored !== 'object' || stored === null) return merged;
	const values = stored as Record<string, unknown>;
	for (const key of Object.keys(DEFAULT_SETTINGS) as ToggleKey[]) {
		const value = values[key];
		if (typeof value === 'boolean') merged[key] = value;
	}
	return merged;
}

export class FlowSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: FlowPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		this.addToggle(
			'Remember zoom per note',
			'Reopen each note at the item you zoomed into.',
			'rememberZoom',
			null,
		);
		this.addToggle(
			'Show the zoomed item at the left edge',
			'Move the zoomed item to the left edge of the note and hide the indent guides of the levels above it.',
			'cleanZoom',
			() => this.app.workspace.updateOptions(),
		);
		this.addToggle(
			'Hide block ids',
			'Hide the id at the end of an item unless the cursor is on its line.',
			'hideBlockIds',
			() => this.app.workspace.updateOptions(),
		);
		this.addToggle(
			'Suggest items after ((',
			'Type (( to search the items of your notes and insert a link to one.',
			'itemSuggester',
			null,
		);
		this.addToggle(
			'Hide embed titles in bullets',
			'Hide the title bar of a note embedded in a bullet, so the bullet lines up with the first line of the embed.',
			'hideEmbedTitles',
			() => this.app.workspace.updateOptions(),
		);
		new Setting(this.containerEl).setName('Bullets and thread lines').setHeading();
		this.addToggle(
			'Click bullet to zoom',
			'Select a bullet to zoom into that item.',
			'clickBulletToZoom',
			null,
		);
		this.addToggle(
			'Click thread line to fold',
			'Select a thread line to fold its branch. Hold Alt to fold every descendant too.',
			'clickThreadLineToFold',
			null,
		);
		this.addToggle(
			'Use mouse back and forward for zoom',
			"Step through zoom levels first. When none are left, Obsidian's own back and forward apply.",
			'useMouseHistory',
			null,
		);
		this.addToggle(
			'Drag items by their bullet',
			'Press a bullet and move to drag the item and its children, also to another open note. A click on the bullet still zooms.',
			'dragItems',
			() => this.app.workspace.updateOptions(),
		);
		new Setting(this.containerEl).setName('List editing').setHeading();
		this.addToggle(
			'Enter on an empty item outdents it',
			'Outdent an empty item, or end the list when it is at the top level.',
			'enterOutdentsEmptyItem',
			null,
		);
		this.addToggle(
			'Backspace at the start of an item merges it',
			'Join the item with the one above instead of deleting the bullet.',
			'backspaceMergesItem',
			null,
		);
		this.addToggle(
			'Home stays inside the item text',
			'Move to the start of the item text before moving to the start of the line.',
			'homeStaysInItem',
			null,
		);
		this.addToggle(
			'Select all starts with the item text',
			'Select the text of the item first. Select all again to select the whole note.',
			'selectAllStaysInItem',
			null,
		);
		this.addToggle(
			'Tab and Shift-Tab move whole items',
			'Indent and outdent the item with its children. Turn this on to replace the editor keys.',
			'tabIndentsItem',
			null,
		);
	}

	private addToggle(
		name: string,
		description: string,
		key: ToggleKey,
		afterChange: (() => void) | null,
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(description)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings[key]).onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
					afterChange?.();
				}),
			);
	}
}
