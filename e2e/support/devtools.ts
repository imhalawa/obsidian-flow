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

	/** Captures the window as PNG data in base64. */
	async screenshot(): Promise<string> {
		const result = (await this.send('Page.captureScreenshot', { format: 'png' })) as {
			data: string;
		};
		return result.data;
	}

	/** Moves the pointer, or presses and releases a mouse button, at a point of the window. */
	async pointer(
		x: number,
		y: number,
		action: 'move' | 'click',
		button: 'left' | 'right',
		modifiers: number,
	): Promise<void> {
		await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers });
		if (action === 'move') return;
		const press = { x, y, button, clickCount: 1, modifiers };
		await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...press });
		await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...press });
	}

	/** Touches a point of the window and lifts the finger again, as a tap does. */
	async tap(x: number, y: number): Promise<void> {
		await this.send('Emulation.setTouchEmulationEnabled', { enabled: true });
		await this.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x, y }],
		});
		await this.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await this.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	}

	/** Presses the left button at the first point, moves through the others with it held and releases at the last. */
	async dragThrough(points: readonly { x: number; y: number }[]): Promise<void> {
		const [first, ...rest] = points;
		const last = rest[rest.length - 1];
		if (!first || !last) throw new Error('A drag needs at least two points.');
		await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...first });
		await this.send('Input.dispatchMouseEvent', {
			type: 'mousePressed',
			...first,
			button: 'left',
			buttons: 1,
			clickCount: 1,
		});
		for (const point of rest) {
			await this.send('Input.dispatchMouseEvent', {
				type: 'mouseMoved',
				...point,
				button: 'left',
				buttons: 1,
			});
		}
		await this.send('Input.dispatchMouseEvent', {
			type: 'mouseReleased',
			...last,
			button: 'left',
			buttons: 0,
			clickCount: 1,
		});
	}

	/** Presses, moves or releases the held left button at a point. */
	async held(phase: 'press' | 'move' | 'release', x: number, y: number): Promise<void> {
		if (phase === 'press') {
			await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
			await this.send('Input.dispatchMouseEvent', {
				type: 'mousePressed',
				x,
				y,
				button: 'left',
				buttons: 1,
				clickCount: 1,
			});
		} else if (phase === 'move') {
			await this.send('Input.dispatchMouseEvent', {
				type: 'mouseMoved',
				x,
				y,
				button: 'left',
				buttons: 1,
			});
		} else {
			await this.send('Input.dispatchMouseEvent', {
				type: 'mouseReleased',
				x,
				y,
				button: 'left',
				buttons: 0,
				clickCount: 1,
			});
		}
	}

	/** Types text into the focused element one character at a time, the way input methods do. */
	async insertText(text: string): Promise<void> {
		for (const character of text) {
			await this.send('Input.insertText', { text: character });
		}
	}

	/** Presses and releases a key; the text is what the key types, if anything. */
	async key(
		key: string,
		code: string,
		keyCode: number,
		text: string | null,
		modifiers: number,
	): Promise<void> {
		const press = {
			key,
			code,
			windowsVirtualKeyCode: keyCode,
			nativeVirtualKeyCode: keyCode,
			modifiers,
		};
		const type = text === null ? 'rawKeyDown' : 'keyDown';
		await this.send('Input.dispatchKeyEvent', {
			type,
			...press,
			...(text === null ? {} : { text }),
		});
		await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...press });
	}

	/** Makes the window report that the user prefers reduced motion, or stop reporting it. */
	async emulateReducedMotion(reduced: boolean): Promise<void> {
		await this.send('Emulation.setEmulatedMedia', {
			features: [
				{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' },
			],
		});
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
