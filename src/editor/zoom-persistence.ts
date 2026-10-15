import type { Extension } from '@codemirror/state';
import { ViewPlugin, type EditorView, type ViewUpdate } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import type { ZoomMemoryPort } from './zoom-memory';
import { ZoomSession, type SessionTimers } from './zoom-session';

const windowTimers: SessionTimers = {
	defer: (task) => {
		void Promise.resolve().then(task);
	},
	later: (task, delayMs) => activeWindow.setTimeout(task, delayMs),
	cancel: (id) => activeWindow.clearTimeout(id),
};

/** Returns the extension that restores and remembers the zoom of the note shown in each editor. */
export function zoomPersistence(memory: ZoomMemoryPort): Extension {
	return ViewPlugin.fromClass(
		class {
			private readonly session: ZoomSession | null;

			constructor(view: EditorView) {
				const path = view.state.field(editorInfoField, false)?.file?.path;
				this.session = path ? new ZoomSession(view, path, memory, windowTimers) : null;
				this.session?.start();
			}

			update(update: ViewUpdate): void {
				this.session?.afterUpdate(update.startState, update.state, update.transactions);
			}

			destroy(): void {
				this.session?.destroy();
			}
		},
	);
}
