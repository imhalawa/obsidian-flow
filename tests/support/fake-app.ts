export interface FakeFile {
	path: string;
}

type VaultHandler = (file: FakeFile, oldPath: string) => void;

/** A stand-in for the parts of the Obsidian app that the plugin uses at load time. */
export class FakeApp {
	readonly storage = new Map<string, unknown>();
	readonly handlers = new Map<string, VaultHandler>();
	readonly vault = {
		on: (name: string, handler: VaultHandler): string => {
			this.handlers.set(name, handler);
			return name;
		},
	};

	updateOptionsCalls = 0;
	readonly mainWindow = { history: { back: () => undefined, forward: () => undefined } };
	readonly workspace = {
		updateOptions: (): void => {
			this.updateOptionsCalls += 1;
		},
		containerEl: { ownerDocument: { defaultView: this.mainWindow } },
		onLayoutReady: (callback: () => void): void => callback(),
		iterateAllLeaves: (): void => undefined,
		on: (name: string): string => name,
	};

	loadLocalStorage(key: string): unknown {
		return this.storage.get(key) ?? null;
	}

	saveLocalStorage(key: string, data: unknown): void {
		this.storage.set(key, data);
	}
}
