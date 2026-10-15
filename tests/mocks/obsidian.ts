export class Plugin {
	app: unknown;
	private stored: unknown = null;
	readonly settingTabs: unknown[] = [];

	constructor(app: unknown = {}) {
		this.app = app;
	}
	async loadData(): Promise<unknown> {
		return this.stored;
	}
	async saveData(data: unknown): Promise<void> {
		this.stored = data;
	}
	addSettingTab(tab: unknown): void {
		this.settingTabs.push(tab);
	}
}

export class PluginSettingTab {
	containerEl = { empty: () => undefined };
	constructor(
		public app: unknown,
		public plugin: unknown,
	) {}
}

export type App = unknown;
