import WebSocket from 'ws';

interface PendingCall {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
}

interface Target {
	type: string;
	title: string;
	webSocketDebuggerUrl: string;
}

/** A connection to one Obsidian window over the Chrome DevTools protocol. */
export class DevtoolsConnection {
	private nextId = 1;
	private readonly pending = new Map<number, PendingCall>();

	private constructor(private readonly socket: WebSocket) {
		socket.on('message', (data) => {
			const message = JSON.parse((data as Buffer).toString()) as {
				id?: number;
				result?: unknown;
				error?: { message: string };
			};
			if (message.id === undefined) return;
			const call = this.pending.get(message.id);
			this.pending.delete(message.id);
			if (message.error) call?.reject(new Error(message.error.message));
			else call?.resolve(message.result);
		});
	}

	/** Connects to the first page target on a debugging port. */
	static async connect(port: number): Promise<DevtoolsConnection> {
		const response = await fetch(`http://127.0.0.1:${port}/json`);
		const targets = (await response.json()) as Target[];
		const page = targets.find((target) => target.type === 'page');
		if (!page) throw new Error('Obsidian has no window to connect to yet.');
		const socket = new WebSocket(page.webSocketDebuggerUrl);
		await new Promise<void>((resolve, reject) => {
			socket.once('open', () => resolve());
			socket.once('error', reject);
		});
		return new DevtoolsConnection(socket);
	}

	/** Evaluates an expression in the window and returns its value. */
	async evaluate<T>(expression: string): Promise<T> {
		const result = (await this.send('Runtime.evaluate', {
			expression,
			awaitPromise: true,
			returnByValue: true,
		})) as {
			result: { value: T };
			exceptionDetails?: { exception?: { description?: string } };
		};
		if (result.exceptionDetails) {
			throw new Error(result.exceptionDetails.exception?.description ?? 'Evaluation failed.');
		}
		return result.result.value;
	}

	/** Types text into the focused element one character at a time, the way input methods do. */
	async insertText(text: string): Promise<void> {
		for (const character of text) {
			await this.send('Input.insertText', { text: character });
		}
	}

	/** Closes the connection. */
	close(): void {
		this.socket.close();
	}

	private send(method: string, params: object): Promise<unknown> {
		const id = this.nextId;
		this.nextId += 1;
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.socket.send(JSON.stringify({ id, method, params }));
		});
	}
}
