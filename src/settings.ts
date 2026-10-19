import { App, PluginSettingTab, Setting } from 'obsidian';
import type { SettingDefinition, SettingDefinitionItem } from 'obsidian';
import type RoamerPlugin from './main';
import { SETTING_SECTIONS, type ToggleEntry } from './setting-sections';

export interface RoamerSettings {
	rememberZoom: boolean;
	cleanZoom: boolean;
	fixedIndentSpacing: boolean;
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
	keepBulletOutOfSelection: boolean;
}

export const DEFAULT_SETTINGS: RoamerSettings = {
	rememberZoom: true,
	cleanZoom: true,
	fixedIndentSpacing: true,
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
	keepBulletOutOfSelection: true,
};

export type ToggleKey = {
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

/** Tells whether a key names one of the toggles. */
function isToggleKey(key: string): key is ToggleKey {
	return Object.keys(DEFAULT_SETTINGS).includes(key);
}

export class RoamerSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: RoamerPlugin,
	) {
		super(app, plugin);
	}

	/** Renders the tab by hand, which Obsidian does only before 1.13. */
	display(): void {
		this.containerEl.empty();
		for (const section of SETTING_SECTIONS) {
			if (section.heading !== null) {
				new Setting(this.containerEl).setName(section.heading).setHeading();
			}
			for (const toggle of section.toggles) this.addToggle(toggle);
		}
	}

	/** Describes the tab to Obsidian 1.13 and later, which renders it and searches it. */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return SETTING_SECTIONS.flatMap((section): SettingDefinitionItem[] => {
			const items = section.toggles.map((toggle): SettingDefinition => ({
				name: toggle.name,
				desc: toggle.description,
				control: { type: 'toggle', key: toggle.key },
			}));
			if (section.heading === null) return items;
			return [{ type: 'group', heading: section.heading, items }];
		});
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (!isToggleKey(key) || typeof value !== 'boolean') return;
		await this.change(key, value);
	}

	private async change(key: ToggleKey, value: boolean): Promise<void> {
		this.plugin.settings[key] = value;
		await this.plugin.saveSettings();
		const entry = SETTING_SECTIONS.flatMap((section) => section.toggles).find(
			(toggle) => toggle.key === key,
		);
		if (entry?.refreshesEditors === true) this.app.workspace.updateOptions();
	}

	private addToggle(toggle: ToggleEntry): void {
		new Setting(this.containerEl)
			.setName(toggle.name)
			.setDesc(toggle.description)
			.addToggle((control) =>
				control
					.setValue(this.plugin.settings[toggle.key])
					.onChange((value) => this.change(toggle.key, value)),
			);
	}
}
