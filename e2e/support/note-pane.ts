import type { ObsidianApp } from './obsidian-app';

export interface Point {
	x: number;
	y: number;
}

export interface Box {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

/** Drives the editor that shows one note, wherever its pane is. */
export class NotePane {
	private constructor(
		private readonly app: ObsidianApp,
		readonly path: string,
	) {}

	/** Refers to the editor of the note at a path. */
	static of(app: ObsidianApp, path: string): NotePane {
		return new NotePane(app, path);
	}

	private script(expression: string): string {
		return `(() => { let found = null; app.workspace.iterateAllLeaves((leaf) => { if (leaf.view.file?.path === ${JSON.stringify(this.path)} && leaf.view.editor) found = leaf.view; }); const cm = found.editor.cm; return ${expression}; })()`;
	}

	private evaluate<T>(expression: string): Promise<T> {
		return this.app.evaluate<T>(this.script(expression));
	}

	/** Returns the text of the note in this editor. */
	text(): Promise<string> {
		return this.evaluate<string>('cm.state.doc.toString()');
	}

	/** Returns the number of drag handles the editor draws, which is none. */
	handleCount(): Promise<number> {
		return this.evaluate<number>('cm.dom.querySelectorAll(".roamer-drag-handle").length');
	}

	/** Returns the box of the first row of a line in window coordinates. */
	lineBox(line: number): Promise<Box> {
		return this.evaluate<Box>(
			`(() => { const at = cm.state.doc.line(${line + 1}); const start = cm.coordsAtPos(at.from); const end = cm.coordsAtPos(at.to); return { top: start.top, bottom: start.bottom, left: start.left, right: end.right }; })()`,
		);
	}

	/** Returns the middle of the bullet of the item that starts on a line. */
	async bulletPoint(line: number): Promise<Point> {
		return this.evaluate<Point>(
			`(() => { const row = cm.state.doc.line(${line + 1}); const indent = /^\\s*/.exec(row.text)[0].length; const start = cm.coordsAtPos(row.from + indent); const end = cm.coordsAtPos(row.from + indent + 1); return { x: (start.left + end.left) / 2, y: (start.top + start.bottom) / 2 }; })()`,
		);
	}

	/** Returns the number of drop indicator lines on screen in this editor. */
	indicatorCount(): Promise<number> {
		return this.evaluate<number>('cm.dom.querySelectorAll(".roamer-drop-indicator").length');
	}

	/** Undoes the last change in this editor. */
	async undo(): Promise<void> {
		await this.evaluate<boolean>('(found.editor.undo(), true)');
	}
}
