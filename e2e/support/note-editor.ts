import type { ObsidianApp } from './obsidian-app';

export interface Position {
	line: number;
	ch: number;
}

export interface Selection {
	anchor: Position;
	head: Position;
}

let noteCounter = 0;

/** Drives the editor of the note that is open in the Obsidian window. */
export class NoteEditor {
	private constructor(private readonly app: ObsidianApp) {}

	/** Creates a note with the given text, opens it and waits for its editor. */
	static async open(app: ObsidianApp, text: string): Promise<NoteEditor> {
		noteCounter += 1;
		await app.evaluate(
			`(async () => {
				const file = await app.vault.create(${JSON.stringify(`note-${noteCounter}.md`)}, ${JSON.stringify(text)});
				const leaf = app.workspace.getLeaf(false);
				await leaf.openFile(file);
				app.workspace.setActiveLeaf(leaf, { focus: true });
				return true;
			})()`,
		);
		await app.evaluate(
			`new Promise((resolve) => { const check = () => app.workspace.activeEditor?.editor ? resolve(true) : setTimeout(check, 50); check(); })`,
		);
		return new NoteEditor(app);
	}

	/** Drives the editor of the note that is already active, wherever its window is. */
	static attach(app: ObsidianApp): NoteEditor {
		return new NoteEditor(app);
	}

	/** Places the selection; a caret has the same anchor and head. */
	async select(selection: Selection): Promise<void> {
		await this.app.evaluate(
			`app.workspace.activeEditor.editor.setSelection(${JSON.stringify(selection.anchor)}, ${JSON.stringify(selection.head)})`,
		);
	}

	/** Places a caret. */
	caret(line: number, ch: number): Promise<void> {
		const position = { line, ch };
		return this.select({ anchor: position, head: position });
	}

	/** Runs a plugin command by id and returns whether Obsidian ran it. */
	runCommand(id: string): Promise<boolean> {
		return this.app.evaluate<boolean>(
			`app.commands.executeCommandById(${JSON.stringify(`flow-outliner:${id}`)})`,
		);
	}

	/** Tells whether Obsidian offers a plugin command for the current cursor. */
	isAvailable(id: string): Promise<boolean> {
		return this.app.evaluate<boolean>(
			`app.commands.commands[${JSON.stringify(`flow-outliner:${id}`)}].checkCallback(true)`,
		);
	}

	/** Runs one of Obsidian's own editor commands, such as indentMore. */
	async exec(command: string): Promise<void> {
		await this.app.evaluate(
			`app.workspace.activeEditor.editor.exec(${JSON.stringify(command)})`,
		);
	}

	/** Returns the text of the note. */
	text(): Promise<string> {
		return this.app.evaluate<string>('app.workspace.activeEditor.editor.getValue()');
	}

	/** Returns the current selections. */
	selections(): Promise<Selection[]> {
		return this.app.evaluate<Selection[]>(
			'app.workspace.activeEditor.editor.listSelections().map((s) => ({ anchor: s.anchor, head: s.head }))',
		);
	}

	/** Undoes the last editor change. */
	async undo(): Promise<void> {
		await this.app.evaluate('app.workspace.activeEditor.editor.undo()');
	}

	/** Returns the texts of the notices on screen. */
	notices(): Promise<string[]> {
		return this.app.evaluate<string[]>(
			'Array.from(activeDocument.querySelectorAll(".notice")).map((el) => el.textContent)',
		);
	}

	/** Returns the text of the lines the editor draws, which excludes hidden lines. */
	visibleLines(): Promise<string[]> {
		return this.app.evaluate<string[]>(
			'Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-content .cm-line")).map((el) => el.textContent)',
		);
	}

	/** Returns the labels of the breadcrumb trail on screen. */
	crumbs(): Promise<string[]> {
		return this.app.evaluate<string[]>(
			'Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .flow-breadcrumbs__crumb")).map((el) => el.textContent)',
		);
	}

	/** Clicks the breadcrumb with the given label. */
	async clickCrumb(label: string): Promise<void> {
		await this.app.evaluate(
			`Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .flow-breadcrumbs__crumb")).find((el) => el.textContent === ${JSON.stringify(label)}).click()`,
		);
	}

	/** Inserts text at a position as a user edit, the way typing does. */
	async type(position: Position, text: string): Promise<void> {
		await this.app.evaluate(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const at = cm.state.doc.line(${position.line + 1}).from + ${position.ch}; cm.dispatch({ changes: { from: at, insert: ${JSON.stringify(text)} }, userEvent: "input.type" }); return true; })()`,
		);
	}

	/** Replaces a range inside one line as a user edit. */
	async replace(line: number, fromCh: number, toCh: number, text: string): Promise<void> {
		await this.app.evaluate(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const start = cm.state.doc.line(${line + 1}).from; cm.dispatch({ changes: { from: start + ${fromCh}, to: start + ${toCh}, insert: ${JSON.stringify(text)} }, userEvent: "input.type" }); return true; })()`,
		);
	}

	/** Opens another note in the same pane and then comes back to this one. */
	async reopen(): Promise<void> {
		await this.reopenAfter('null');
	}

	/** Rewrites this note on disk while another note is open, then comes back to it. */
	async reopenAfterRewriting(text: string): Promise<void> {
		await this.reopenAfter(JSON.stringify(text));
	}

	private async reopenAfter(rewrittenText: string): Promise<void> {
		await this.app.evaluate(
			`(async () => {
				const file = app.workspace.getActiveFile();
				const other = await app.vault.create('other-' + Date.now() + '.md', 'x');
				const leaf = app.workspace.getLeaf(false);
				await leaf.openFile(other);
				const text = ${rewrittenText};
				if (text !== null) await app.vault.modify(file, text);
				await leaf.openFile(file);
				return true;
			})()`,
		);
	}

	/** Waits until the breadcrumb trail is on screen and returns it; returns an empty trail on timeout. */
	async waitForCrumbs(timeoutMs: number): Promise<string[]> {
		const deadline = Date.now() + timeoutMs;
		let crumbs = await this.crumbs();
		while (crumbs.length === 0 && Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			crumbs = await this.crumbs();
		}
		return crumbs;
	}

	/** Returns the path of the open note. */
	path(): Promise<string> {
		return this.app.evaluate<string>('app.workspace.getActiveFile().path');
	}

	/** Returns the folds as Obsidian reports them, in lines. */
	async folds(): Promise<{ from: number; to: number }[]> {
		const info = await this.app.evaluate<{ folds: { from: number; to: number }[] }>(
			'app.workspace.activeLeaf.view.currentMode.getFoldInfo()',
		);
		return info.folds;
	}

	/** Returns the ids of the blocks Obsidian found in the open note once it has saved and indexed it. */
	async blockIds(): Promise<string[]> {
		const read = () =>
			this.app.evaluate<string[]>(
				'Object.keys(app.metadataCache.getFileCache(app.workspace.getActiveFile())?.blocks ?? {})',
			);
		let ids = await read();
		for (let attempt = 0; attempt < 40 && ids.length === 0; attempt += 1) {
			await new Promise((resolve) => setTimeout(resolve, 250));
			ids = await read();
		}
		return ids;
	}

	/** Focuses the editor, puts the caret at the end of the note and types text as a user does. */
	async typeKeys(text: string): Promise<void> {
		await this.app.evaluate(
			'(() => { const editor = app.workspace.activeEditor.editor; editor.focus(); editor.setCursor(editor.offsetToPos(editor.getValue().length)); return true; })()',
		);
		await this.app.typeText(text);
	}

	/** Waits until Obsidian has indexed the list items of a note. */
	async waitUntilIndexed(path: string): Promise<void> {
		await this.app.evaluate(
			`new Promise((resolve) => { const check = () => { const file = app.vault.getFileByPath(${JSON.stringify(path)}); if (file && app.metadataCache.getFileCache(file)?.listItems) resolve(true); else setTimeout(check, 50); }; check(); })`,
		);
	}

	/** Waits for the item suggestions to show and returns their texts. */
	suggestions(): Promise<string[]> {
		return this.app.evaluate<string[]>(
			`new Promise((resolve) => { const read = () => Array.from(activeDocument.querySelectorAll(".flow-item-suggest-text")).map((el) => el.textContent); const check = () => { const found = read(); if (found.length > 0) resolve(found); else setTimeout(check, 50); }; check(); })`,
		);
	}

	/** Clicks the item suggestion with the given text. */
	async chooseSuggestion(text: string): Promise<void> {
		await this.app.evaluate(
			`Array.from(activeDocument.querySelectorAll(".flow-item-suggest-text")).find((el) => el.textContent === ${JSON.stringify(text)}).click()`,
		);
	}

	/** Reads a note from disk by path. */
	readNote(path: string): Promise<string> {
		return this.app.evaluate<string>(
			`app.vault.read(app.vault.getFileByPath(${JSON.stringify(path)}))`,
		);
	}

	/** Returns the window point at the middle of the bullet of the item that starts on a line. */
	bulletPoint(line: number): Promise<{ x: number; y: number }> {
		return this.app.evaluate<{ x: number; y: number }>(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const row = cm.state.doc.line(${line + 1}); const indent = /^\\s*/.exec(row.text)[0].length; const start = cm.coordsAtPos(row.from + indent); const end = cm.coordsAtPos(row.from + indent + 1); return { x: (start.left + end.left) / 2, y: (start.top + start.bottom) / 2 }; })()`,
		);
	}

	/** Returns the vertical middle of a line in window coordinates. */
	linePoint(line: number): Promise<number> {
		return this.app.evaluate<number>(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const start = cm.coordsAtPos(cm.state.doc.line(${line + 1}).from); return (start.top + start.bottom) / 2; })()`,
		);
	}

	/** Tells whether the pointer shows the clickable cursor over an item control. */
	pointerIsOverControl(): Promise<boolean> {
		return this.app.evaluate<boolean>(
			'app.workspace.activeEditor.editor.cm.dom.classList.contains("flow-over-item-control")',
		);
	}

	/** Returns the labels of the entries of the open menu. */
	menuEntries(): Promise<string[]> {
		return this.app.evaluate<string[]>(
			'Array.from(activeDocument.querySelectorAll(".menu .menu-item-title")).map((el) => el.textContent)',
		);
	}

	/** Clicks the entry of the open menu with the given label. */
	async chooseMenuEntry(label: string): Promise<void> {
		await this.app.evaluate(
			`Array.from(activeDocument.querySelectorAll(".menu .menu-item")).find((el) => el.querySelector(".menu-item-title").textContent === ${JSON.stringify(label)}).click()`,
		);
	}
}
