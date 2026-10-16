import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DevtoolsConnection } from './devtools';
import { ensureObsidian } from './install-obsidian';

const DISPLAY = ':99';
const SCREEN_SIZE = '2560x1000x24';
const WINDOW_ORIGIN = process.platform === 'linux' ? 0 : -32000;
const DEFAULT_WINDOW = { width: 1280, height: 900 };
const PLUGIN_ID = 'flow-outliner';
const PLUGIN_FILES = ['main.js', 'manifest.json', 'styles.css'];

interface KeyDefinition {
	key: string;
	code: string;
	keyCode: number;
	text: string | null;
}

const KEYS = {
	enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
	backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8, text: null },
	delete: { key: 'Delete', code: 'Delete', keyCode: 46, text: null },
	home: { key: 'Home', code: 'Home', keyCode: 36, text: null },
	tab: { key: 'Tab', code: 'Tab', keyCode: 9, text: '\t' },
	a: { key: 'a', code: 'KeyA', keyCode: 65, text: null },
	end: { key: 'End', code: 'End', keyCode: 35, text: null },
	down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, text: null },
	escape: { key: 'Escape', code: 'Escape', keyCode: 27, text: null },
} satisfies Record<string, KeyDefinition>;

export type KeyName = keyof typeof KEYS;

/** Returns the port Obsidian chose for remote debugging, which it writes into its user data folder. */
function debugPort(userData: string): number {
	return Number(readFileSync(join(userData, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
}

/** Waits until a condition holds, polling every 250 ms. */
async function waitFor<T>(description: string, attempt: () => Promise<T | null>): Promise<T> {
	for (let tries = 0; tries < 120; tries += 1) {
		const value = await attempt().catch(() => null);
		if (value !== null) return value;
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error(`Timed out waiting for ${description}.`);
}

/** A running Obsidian window with the plugin enabled in a throwaway vault. */
export class ObsidianApp {
	private constructor(
		private readonly process: ChildProcess,
		private readonly display: ChildProcess | null,
		private readonly connection: DevtoolsConnection,
		private readonly workspace: string,
	) {}

	/** Starts Obsidian under a virtual display with the built plugin installed and enabled. */
	static async start(): Promise<ObsidianApp> {
		const app = await ObsidianApp.launch();
		await app.enablePlugin();
		return app;
	}

	/** Starts Obsidian with the built plugin installed but not enabled yet. */
	static startWithoutPlugin(): Promise<ObsidianApp> {
		return ObsidianApp.launch();
	}

	private static async launch(): Promise<ObsidianApp> {
		const workspace = mkdtempSync(join(tmpdir(), 'flow-e2e-'));
		const vault = join(workspace, 'vault');
		const pluginDirectory = join(vault, '.obsidian', 'plugins', PLUGIN_ID);
		mkdirSync(pluginDirectory, { recursive: true });
		for (const file of PLUGIN_FILES) {
			try {
				cpSync(join(process.cwd(), file), join(pluginDirectory, file));
			} catch {
				continue;
			}
		}
		const userData = join(workspace, 'user-data');
		mkdirSync(userData, { recursive: true });
		writeFileSync(
			join(userData, 'obsidian.json'),
			JSON.stringify({ vaults: { flow: { path: vault, ts: 1, open: true } } }),
		);
		const display =
			process.platform === 'linux'
				? spawn('Xvfb', [DISPLAY, '-screen', '0', SCREEN_SIZE], { stdio: 'ignore' })
				: null;
		const env = display ? { ...process.env, DISPLAY } : process.env;
		const child = spawn(
			ensureObsidian(),
			[
				'--no-sandbox',
				'--disable-gpu',
				'--disable-backgrounding-occluded-windows',
				'--disable-renderer-backgrounding',
				'--disable-features=CalculateNativeWinOcclusion',
				'--remote-debugging-port=0',
				`--user-data-dir=${userData}`,
			],
			{ env, stdio: 'ignore' },
		);
		const connection = await waitFor('Obsidian to start', async () => {
			const opened = await DevtoolsConnection.connect(debugPort(userData));
			const ready = await opened.evaluate<boolean>(
				'typeof app !== "undefined" && app.workspace.layoutReady === true',
			);
			return ready ? opened : null;
		});
		const app = new ObsidianApp(child, display, connection, workspace);
		if (!display) await app.evaluate('(electronWindow.setFocusable(false), true)');
		await app.dismissTrustPrompt();
		await app.resizeWindow(DEFAULT_WINDOW.width, DEFAULT_WINDOW.height);
		return app;
	}

	/** Turns community plugins on and enables the plugin, as a user does in the settings. */
	async enablePlugin(): Promise<void> {
		await this.evaluate(
			`(async () => { await app.plugins.setEnable(true); await app.plugins.enablePlugin(${JSON.stringify(PLUGIN_ID)}); })()`,
		);
	}

	/** Disables the plugin, as a user does in the settings. */
	async disablePlugin(): Promise<void> {
		await this.evaluate(
			`(async () => { await app.plugins.disablePlugin(${JSON.stringify(PLUGIN_ID)}); })()`,
		);
	}

	/** Returns the errors the window has logged or thrown since it started. */
	consoleErrors(): string[] {
		return this.connection.consoleErrors();
	}

	/** Evaluates an expression inside the Obsidian window. */
	evaluate<T>(expression: string): Promise<T> {
		return this.connection.evaluate<T>(expression);
	}

	/** Closes the prompt that asks whether to trust the vault, which appears shortly after the window opens. */
	private async dismissTrustPrompt(): Promise<void> {
		await this.evaluate(
			`new Promise((resolve) => { let tries = 0; const check = () => { if (activeDocument.querySelector(".modal-container")) { activeDocument.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); resolve(true); } else if (tries > 40) resolve(false); else { tries += 1; setTimeout(check, 100); } }; check(); })`,
		);
	}

	/** Moves the pointer to a point of the window. */
	movePointer(x: number, y: number): Promise<void> {
		return this.connection.pointer(x, y, 'move', 'left', 0);
	}

	/** Clicks at a point of the window; alt holds the Alt key. */
	click(x: number, y: number, alt: boolean): Promise<void> {
		return this.connection.pointer(x, y, 'click', 'left', alt ? 1 : 0);
	}

	/** Taps a point of the window with a finger. */
	tap(x: number, y: number): Promise<void> {
		return this.connection.tap(x, y);
	}

	/** Presses, moves or releases the held left button at a point of the window. */
	holdButton(phase: 'press' | 'move' | 'release', x: number, y: number): Promise<void> {
		return this.connection.held(phase, x, y);
	}

	/** Drags with the left button through the given points of the window. */
	drag(points: readonly { x: number; y: number }[]): Promise<void> {
		return this.connection.dragThrough(points);
	}

	/** Right-clicks at a point of the window. */
	rightClick(x: number, y: number): Promise<void> {
		return this.connection.pointer(x, y, 'click', 'right', 0);
	}

	/** Presses a key of the keyboard; shift and control hold those modifier keys. */
	pressKey(name: KeyName, shift: boolean, control: boolean): Promise<void> {
		const key = KEYS[name];
		const modifiers = (shift ? 8 : 0) + (control ? 2 : 0);
		return this.connection.key(key.key, key.code, key.keyCode, key.text, modifiers);
	}

	/** Presses a side button of the mouse over a point of the screen, as a real mouse does. */
	async pressSideButton(x: number, y: number, button: 'back' | 'forward'): Promise<void> {
		if (process.platform !== 'linux') return this.connection.pointer(x, y, 'click', button, 0);
		const code = button === 'back' ? '8' : '9';
		execFileSync('xdotool', ['mousemove', String(x), String(y), 'click', code], {
			env: { ...process.env, DISPLAY },
		});
	}

	/** Sets the size of the Obsidian window in pixels. */
	async resizeWindow(width: number, height: number): Promise<void> {
		await this.evaluate(
			`(electronWindow.setBounds({ x: ${WINDOW_ORIGIN}, y: ${WINDOW_ORIGIN}, width: ${width}, height: ${height} }), true)`,
		);
	}

	/** Saves a screenshot of the window as a PNG file. */
	async screenshot(path: string): Promise<void> {
		writeFileSync(path, Buffer.from(await this.connection.screenshot(), 'base64'));
	}

	/** Makes the window report that the user prefers reduced motion, or stop reporting it. */
	emulateReducedMotion(reduced: boolean): Promise<void> {
		return this.connection.emulateReducedMotion(reduced);
	}

	/** Types text into the focused editor one character at a time. */
	typeText(text: string): Promise<void> {
		return this.connection.insertText(text);
	}

	/** Stops Obsidian and removes the throwaway vault. */
	async stop(): Promise<void> {
		this.connection.close();
		const exited = new Promise((resolve) => this.process.once('exit', resolve));
		this.process.kill('SIGKILL');
		this.display?.kill('SIGKILL');
		await exited;
		try {
			rmSync(this.workspace, {
				recursive: true,
				force: true,
				maxRetries: 10,
				retryDelay: 200,
			});
		} catch {
			return;
		}
	}
}
