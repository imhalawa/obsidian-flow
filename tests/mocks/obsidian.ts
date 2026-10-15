import { StateField } from '@codemirror/state';

export const editorInfoField = StateField.define<{ file: { path: string } | null }>({
	create: () => ({ file: null }),
	update: (value) => value,
});

export class Plugin {
	app: unknown;
	private stored: unknown = null;
	readonly settingTabs: unknown[] = [];
	readonly commands: Command[] = [];
	readonly editorExtensions: unknown[] = [];
	readonly editorSuggests: unknown[] = [];
	readonly events: unknown[] = [];

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
	registerEvent(reference: unknown): void {
		this.events.push(reference);
	}
	registerEditorExtension(extension: unknown): void {
		this.editorExtensions.push(extension);
	}
	registerEditorSuggest(suggest: unknown): void {
		this.editorSuggests.push(suggest);
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

export class ToggleStub {
	value = false;
	handler: ((value: boolean) => unknown) | null = null;
	setValue(value: boolean): this {
		this.value = value;
		return this;
	}
	onChange(handler: (value: boolean) => unknown): this {
		this.handler = handler;
		return this;
	}
}

export class Setting {
	static readonly created: Setting[] = [];
	name = '';
	description = '';
	toggle: ToggleStub | null = null;
	constructor(readonly containerEl: unknown) {
		Setting.created.push(this);
	}
	setName(name: string): this {
		this.name = name;
		return this;
	}
	setDesc(description: string): this {
		this.description = description;
		return this;
	}
	addToggle(configure: (toggle: ToggleStub) => unknown): this {
		this.toggle = new ToggleStub();
		configure(this.toggle);
		return this;
	}
}

export class EditorSuggest {
	context: unknown = null;
	constructor(public app: unknown) {}
}
