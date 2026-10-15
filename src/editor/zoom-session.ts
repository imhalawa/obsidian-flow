import type { EditorState, Transaction } from '@codemirror/state';
import { parseOutline } from '../outline/outline-tree';
import { makeAnchor, resolveAnchor } from '../outline/zoom-anchor';
import { dispatchZoom, type ZoomTarget } from './zoom-control';
import { changeIn, zoomField } from './zoom-field';
import type { ZoomMemoryPort } from './zoom-memory';
import { zoomWasRemoved } from './zoom-removed';

export const SAVE_DELAY_MS = 800;

export interface SessionTimers {
	defer(task: () => void): void;
	later(task: () => void, delayMs: number): number;
	cancel(id: number): void;
}

/** Restores the zoom of one note in one editor view and remembers it as the user changes it. */
export class ZoomSession {
	private settled = false;
	private restoreQueued = false;
	private destroyed = false;
	private saveTimer: number | null = null;

	constructor(
		private readonly target: ZoomTarget,
		private readonly path: string,
		private readonly memory: ZoomMemoryPort,
		private readonly timers: SessionTimers,
	) {}

	/** Starts restoring the remembered zoom as soon as the note has content. */
	start(): void {
		this.queueRestore();
	}

	/** Reacts to an editor update: keeps trying to restore, and remembers zoom changes. */
	afterUpdate(
		before: EditorState,
		after: EditorState,
		transactions: readonly Transaction[],
	): void {
		if (!this.memory.enabled()) return;
		this.queueRestore();
		if (transactions.some((transaction) => changeIn(transaction) !== null)) {
			this.saveNow();
		} else if (zoomWasRemoved(before, after, transactions)) {
			this.cancelSave();
			this.memory.remember(this.path, null);
		} else if (after.field(zoomField) && transactions.some((t) => t.docChanged)) {
			this.saveSoon();
		}
	}

	/** Remembers a pending change and stops the session. */
	destroy(): void {
		if (this.saveTimer !== null) this.saveNow();
		this.destroyed = true;
	}

	private queueRestore(): void {
		if (this.settled || this.restoreQueued || this.destroyed) return;
		if (!this.memory.enabled() || this.target.state.doc.length === 0) return;
		this.restoreQueued = true;
		this.timers.defer(() => this.restore());
	}

	private restore(): void {
		this.restoreQueued = false;
		if (this.settled || this.destroyed) return;
		this.settled = true;
		if (this.target.state.field(zoomField) !== null) return;
		const anchor = this.memory.recall(this.path);
		if (!anchor) return;
		const state = this.target.state;
		const startLine = resolveAnchor(parseOutline(state.doc.toJSON(), state.tabSize), anchor);
		if (startLine !== null) dispatchZoom(this.target, startLine, 'visit');
	}

	private saveSoon(): void {
		this.cancelSave();
		this.saveTimer = this.timers.later(() => this.saveNow(), SAVE_DELAY_MS);
	}

	private cancelSave(): void {
		if (this.saveTimer === null) return;
		this.timers.cancel(this.saveTimer);
		this.saveTimer = null;
	}

	private saveNow(): void {
		this.cancelSave();
		const state = this.target.state;
		const zoom = state.field(zoomField);
		const tree = parseOutline(state.doc.toJSON(), state.tabSize);
		const anchor = zoom ? makeAnchor(tree, state.doc.lineAt(zoom.from).number - 1) : null;
		this.memory.remember(this.path, anchor);
	}
}
