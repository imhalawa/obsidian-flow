import { App, PluginSettingTab, Setting } from 'obsidian';
import type RoamerPlugin from './main';

export interface RoamerSettings {
	rememberZoom: boolean;
	cleanZoom: boolean;
	hideEmbedTitles: boolean;
	bulletCallouts: boolean;
	clickBulletToZoom: boolean;
	clickThreadLineToFold: boolean;
	useMouseHistory: boolean;
	dragItems: boolean;
	enterOutdentsEmptyItem: boolean;
	enterAddsFirstChild: boolean;
	backspaceMergesItem: boolean;
	homeStaysInItem: boolean;
	selectAllStaysInItem: boolean;
	tabIndentsItem: boolean;
}

export const DEFAULT_SETTINGS: RoamerSettings = {
	rememberZoom: true,
	cleanZoom: true,
	hideEmbedTitles: true,
	bulletCallouts: true,
	clickBulletToZoom: true,
	clickThreadLineToFold: true,
	useMouseHistory: true,
	dragItems: true,
	enterOutdentsEmptyItem: true,
	enterAddsFirstChild: true,
	backspaceMergesItem: true,
	homeStaysInItem: true,
	selectAllStaysInItem: true,
	tabIndentsItem: false,
};

type ToggleKey = {
	[Key in keyof RoamerSettings]: RoamerSettings[Key] extends boolean ? Key : never;
}[keyof RoamerSettings];

/** Returns the defaults with every stored value that is a boolean laid over them. */
export function mergeSettings(stored: unknown): RoamerSettings {
	const merged = { ...DEFAULT_SETTINGS };
	if (typeof stored !== 'object' || stored === null) return merged;
	const values = stored as Record<string, unknown>;
	for (const key of Object.keys(DEFAULT_SETTINGS) as ToggleKey[]) {
		const value = values[key];
		if (typeof value === 'boolean') merged[key] = value;
	}
	return merged;
}

export class RoamerSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: RoamerPlugin,
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
			'Hide embed titles in bullets',
			'Hide the title bar of a note embedded in a bullet, so the bullet lines up with the first line of the embed.',
			'hideEmbedTitles',
			() => this.app.workspace.updateOptions(),
		);
		this.addToggle(
			'Show callout bullets as callouts',
			'Draw a bullet that starts with > [!tip] as a callout, with its bullet beside it. Put the cursor in it to edit the text.',
			'bulletCallouts',
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
			'Enter on an item with children adds its first child',
			'Add the new item as the first child, as a task when the first child is a task, instead of between the item and its children.',
			'enterAddsFirstChild',
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
