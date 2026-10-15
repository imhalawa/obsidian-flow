export class Plugin {
	app: unknown;
	private stored: unknown = null;
	readonly settingTabs: unknown[] = [];
	readonly commands: Command[] = [];

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
	addCommand(command: Command): Command {
		this.commands.push(command);
		return command;
	}
}

export interface Command {
	id: string;
	name: string;
	editorCheckCallback?: (checking: boolean, editor: unknown, context: unknown) => boolean | void;
}

export class PluginSettingTab {
	containerEl = { empty: () => undefined };
	constructor(
		public app: unknown,
		public plugin: unknown,
	) {}
}

export class Notice {
	static readonly shown: string[] = [];
	constructor(message: string) {
		Notice.shown.push(message);
	}
}

export type App = unknown;
