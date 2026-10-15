import { spawn, type ChildProcess } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DevtoolsConnection } from './devtools';
import { ensureObsidian } from './install-obsidian';

const DISPLAY = ':99';
const DEBUG_PORT = 9222;
const PLUGIN_ID = 'flow-outliner';
const PLUGIN_FILES = ['main.js', 'manifest.json', 'styles.css'];

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
		private readonly display: ChildProcess,
		private readonly connection: DevtoolsConnection,
		private readonly workspace: string,
	) {}

	/** Starts Obsidian under a virtual display with the built plugin installed. */
	static async start(): Promise<ObsidianApp> {
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
		const display = spawn('Xvfb', [DISPLAY, '-screen', '0', '1280x900x24'], {
			stdio: 'ignore',
		});
		const env = { ...process.env, DISPLAY };
		const child = spawn(
			ensureObsidian(),
			[
				'--no-sandbox',
				'--disable-gpu',
				`--remote-debugging-port=${DEBUG_PORT}`,
				`--user-data-dir=${userData}`,
			],
			{ env, stdio: 'ignore' },
		);
		const connection = await waitFor('Obsidian to start', async () => {
			const opened = await DevtoolsConnection.connect(DEBUG_PORT);
			const ready = await opened.evaluate<boolean>(
				'typeof app !== "undefined" && app.workspace.layoutReady === true',
			);
			return ready ? opened : null;
		});
		const app = new ObsidianApp(child, display, connection, workspace);
		await app.evaluate(
			`(async () => { await app.plugins.setEnable(true); await app.plugins.enablePlugin(${JSON.stringify(PLUGIN_ID)}); })()`,
		);
		await app.dismissTrustPrompt();
		return app;
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

	/** Right-clicks at a point of the window. */
	rightClick(x: number, y: number): Promise<void> {
		return this.connection.pointer(x, y, 'click', 'right', 0);
	}

	/** Saves a screenshot of the window as a PNG file. */
	async screenshot(path: string): Promise<void> {
		writeFileSync(path, Buffer.from(await this.connection.screenshot(), 'base64'));
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
		this.display.kill('SIGKILL');
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
