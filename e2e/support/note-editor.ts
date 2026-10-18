import type { ObsidianApp } from './obsidian-app';

export interface Position {
	line: number;
	ch: number;
}

export interface EmbedLayout {
	marked: boolean;
	lineTop: number;
	lineBottom: number;
	embedTop: number;
	embedBottom: number;
	embedLeft: number;
	embedRight: number;
	bulletTop: number;
	bulletRight: number;
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

	/** Gives the editor the keyboard focus. */
	async focus(): Promise<void> {
		await this.app.evaluate('(app.workspace.activeEditor.editor.focus(), true)');
	}

	/** Places a caret. */
	caret(line: number, ch: number): Promise<void> {
		const position = { line, ch };
		return this.select({ anchor: position, head: position });
	}

	/** Runs a plugin command by id and returns whether Obsidian ran it. */
	runCommand(id: string): Promise<boolean> {
		return this.app.evaluate<boolean>(
			`app.commands.executeCommandById(${JSON.stringify(`roamer:${id}`)})`,
		);
	}

	/** Tells whether Obsidian offers a plugin command for the current cursor. */
	isAvailable(id: string): Promise<boolean> {
		return this.app.evaluate<boolean>(
			`app.commands.commands[${JSON.stringify(`roamer:${id}`)}].checkCallback(true)`,
		);
	}

	/** Runs one of Obsidian's own editor commands, such as indentMore. */
	async exec(command: string): Promise<void> {
		await this.app.evaluate(
			`app.workspace.activeEditor.editor.exec(${JSON.stringify(command)})`,
		);
	}

	/** Pastes plain text into the focused editor, as the clipboard does. */
	async paste(text: string): Promise<void> {
		await this.app.evaluate(
			`(() => { const target = activeDocument.querySelector(".workspace-leaf.mod-active .cm-content"); const data = new DataTransfer(); data.setData("text/plain", ${JSON.stringify(text)}); target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })); return true; })()`,
		);
	}

	/** Switches the active note to source mode. */
	async useSourceMode(): Promise<void> {
		await this.app.evaluate(
			`(async () => { const leaf = app.workspace.activeLeaf; const state = leaf.getViewState(); state.state.mode = "source"; state.state.source = true; await leaf.setViewState(state); app.workspace.activeEditor.editor.focus(); return true; })()`,
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

	/** Returns the text of the lines that are marked as revealed by an unfold and the animation they run. */
	revealedLines(): Promise<{ text: string; animation: string }[]> {
		return this.app.evaluate<{ text: string; animation: string }[]>(
			'Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-line.roamer-line-revealed")).map((el) => ({ text: el.textContent, animation: getComputedStyle(el).animationName }))',
		);
	}

	/** Returns the text of the lines the editor draws, which excludes hidden lines. */
	visibleLines(): Promise<string[]> {
		return this.app.evaluate<string[]>(
			'Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-content .cm-line")).map((el) => el.textContent)',
		);
	}

	/** Returns the labels of the zoom levels the panel at the top of the editor shows after the note crumb, hidden ones left out. */
	crumbs(): Promise<string[]> {
		return this.app.evaluate<string[]>(
			'Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-editor .roamer-crumbs .roamer-crumbs__crumb:not(.is-hidden):not(.is-root)")).map((el) => el.textContent)',
		);
	}

	/** Returns the middle of the crumb with the given label in window coordinates. */
	crumbPoint(label: string): Promise<{ x: number; y: number }> {
		return this.app.evaluate<{ x: number; y: number }>(
			`(() => { const crumb = Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-editor .roamer-crumbs__crumb:not(.is-hidden)")).find((el) => el.textContent === ${JSON.stringify(label)}); const box = crumb.getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()`,
		);
	}

	/** Clicks the crumb with the given label with the mouse. */
	async clickCrumb(label: string): Promise<void> {
		const point = await this.crumbPoint(label);
		await this.app.click(point.x, point.y, false);
	}

	/** Returns the middle of the note title in the header in window coordinates. */
	titlePoint(): Promise<{ x: number; y: number }> {
		return this.app.evaluate<{ x: number; y: number }>(
			`(() => { const box = activeDocument.querySelector(".workspace-leaf.mod-active .view-header-title").getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()`,
		);
	}

	/** Clicks the note title in the header with the mouse. */
	async clickTitle(): Promise<void> {
		const point = await this.titlePoint();
		await this.app.click(point.x, point.y, false);
	}

	/** Tells whether the note title in the header has the keyboard focus, as it does when it is being renamed. */
	titleHasFocus(): Promise<boolean> {
		return this.app.evaluate<boolean>(
			'activeDocument.activeElement === activeDocument.querySelector(".workspace-leaf.mod-active .view-header-title")',
		);
	}

	/** Returns the text of the panel at the top of the editor, or an empty text when there is none. */
	panelText(): Promise<string> {
		return this.app.evaluate<string>(
			'activeDocument.querySelector(".workspace-leaf.mod-active .cm-editor .cm-panels-top .roamer-crumbs")?.textContent ?? ""',
		);
	}

	/** Returns how many zoom paths the note header holds; the plugin leaves the header alone, so it is zero. */
	headerPathCount(): Promise<number> {
		return this.app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .view-header .roamer-crumbs").length',
		);
	}

	/** Returns the label of the first crumb, which stands for the whole note. */
	rootCrumbLabel(): Promise<string> {
		return this.app.evaluate<string>(
			'activeDocument.querySelector(".workspace-leaf.mod-active .cm-editor .roamer-crumbs__crumb.is-root")?.textContent ?? ""',
		);
	}

	/** Clicks the first crumb, which shows the whole note. */
	async clickRootCrumb(): Promise<void> {
		const point = await this.app.evaluate<{ x: number; y: number }>(
			'(() => { const box = activeDocument.querySelector(".workspace-leaf.mod-active .cm-editor .roamer-crumbs__crumb.is-root").getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()',
		);
		await this.app.click(point.x, point.y, false);
	}

	/** Gives the first crumb the keyboard focus. */
	async focusRootCrumb(): Promise<void> {
		await this.app.evaluate(
			'(activeDocument.querySelector(".workspace-leaf.mod-active .cm-editor .roamer-crumbs__crumb.is-root").focus(), true)',
		);
	}

	/** Returns the cursor style the pointer shows over the first crumb. */
	rootCrumbCursor(): Promise<string> {
		return this.app.evaluate<string>(
			'getComputedStyle(activeDocument.querySelector(".workspace-leaf.mod-active .cm-editor .roamer-crumbs__crumb.is-root")).cursor',
		);
	}

	/** Returns the texts of the visible crumbs that are cut short. */
	clippedPanelTexts(): Promise<string[]> {
		return this.app.evaluate<string[]>(
			`Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .cm-editor .roamer-crumbs__crumb:not(.is-hidden) .roamer-crumbs__text")).filter((el) => el.scrollWidth > el.clientWidth).map((el) => el.textContent)`,
		);
	}

	/** Limits the width of the panel at the top of the editor, in pixels, to make the path overflow. */
	async limitPanelWidth(pixels: number): Promise<void> {
		await this.app.evaluate(
			`(() => { const panel = activeDocument.querySelector(".workspace-leaf.mod-active .cm-editor .cm-panels-top"); panel.style.width = ${JSON.stringify(`${pixels}px`)}; return true; })()`,
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
	}

	/** Creates a note at a path, folders included, opens it and waits for its editor. */
	static async openAt(app: ObsidianApp, path: string, text: string): Promise<NoteEditor> {
		await app.evaluate(
			`(async () => {
				const folder = ${JSON.stringify(path)}.split("/").slice(0, -1).join("/");
				if (folder && !app.vault.getFolderByPath(folder)) await app.vault.createFolder(folder);
				const file = await app.vault.create(${JSON.stringify(path)}, ${JSON.stringify(text)});
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

	/** Inserts text at a position as a user edit, the way typing does. */
	async type(position: Position, text: string): Promise<void> {
		await this.app.evaluate(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const at = cm.state.doc.line(${position.line + 1}).from + ${position.ch}; cm.dispatch({ changes: { from: at, insert: ${JSON.stringify(text)} }, selection: { anchor: at + ${text.length} }, userEvent: "input.type" }); return true; })()`,
		);
	}

	/** Replaces a range inside one line as a user edit. */
	async replace(line: number, fromCh: number, toCh: number, text: string): Promise<void> {
		await this.app.evaluate(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const start = cm.state.doc.line(${line + 1}).from; cm.dispatch({ changes: { from: start + ${fromCh}, to: start + ${toCh}, insert: ${JSON.stringify(text)} }, selection: { anchor: start + ${fromCh + text.length} }, userEvent: "input.type" }); return true; })()`,
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

	/** Focuses the editor, puts the caret at the end of the note and types text as a user does. */
	async typeKeys(text: string): Promise<void> {
		await this.app.evaluate(
			'(() => { const editor = app.workspace.activeEditor.editor; editor.focus(); editor.setCursor(editor.offsetToPos(editor.getValue().length)); return true; })()',
		);
		await this.app.typeText(text);
	}

	/** Reads a note from disk by path. */
	readNote(path: string): Promise<string> {
		return this.app.evaluate<string>(
			`app.vault.read(app.vault.getFileByPath(${JSON.stringify(path)}))`,
		);
	}

	/** Returns the boxes of an item's line, its embed and its bullet in window coordinates, or null when the line draws no embed. */
	embedLayout(line: number): Promise<EmbedLayout | null> {
		return this.app.evaluate<EmbedLayout | null>(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const row = cm.domAtPos(cm.state.doc.line(${line + 1}).from).node; const lineEl = (row.nodeType === 1 ? row : row.parentElement).closest(".cm-line"); const embed = lineEl.querySelector(".internal-embed"); const bullet = lineEl.querySelector(".list-bullet"); if (!embed || !bullet) return null; const l = lineEl.getBoundingClientRect(); const e = embed.getBoundingClientRect(); const b = bullet.getBoundingClientRect(); return { marked: lineEl.classList.contains("roamer-embed-line"), lineTop: l.top, lineBottom: l.bottom, embedTop: e.top, embedBottom: e.bottom, embedLeft: e.left, embedRight: e.right, bulletTop: b.top, bulletRight: b.right }; })()`,
		);
	}

	/** Returns the window point at the middle of the bullet of the item that starts on a line. */
	bulletPoint(line: number): Promise<{ x: number; y: number }> {
		return this.app.evaluate<{ x: number; y: number }>(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const row = cm.state.doc.line(${line + 1}); const indent = /^\\s*/.exec(row.text)[0].length; const start = cm.coordsAtPos(row.from + indent); const end = cm.coordsAtPos(row.from + indent + 1); return { x: (start.left + end.left) / 2, y: (start.top + start.bottom) / 2 }; })()`,
		);
	}

	/** Returns the box of the fold arrow Obsidian draws on a line, in window coordinates. */
	foldArrowBox(
		line: number,
	): Promise<{ left: number; right: number; top: number; bottom: number }> {
		return this.app.evaluate<{ left: number; right: number; top: number; bottom: number }>(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const start = cm.coordsAtPos(cm.state.doc.line(${line + 1}).from); const middle = (start.top + start.bottom) / 2; const arrow = Array.from(cm.dom.querySelectorAll(".cm-fold-indicator svg")).find((el) => { const box = el.getBoundingClientRect(); return box.top <= middle && middle <= box.bottom; }); const box = arrow.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }; })()`,
		);
	}

	/** Returns the boxes of the highlighted thread lines the editor draws, in window coordinates. */
	threadHighlights(): Promise<
		{ left: number; right: number; top: number; bottom: number; background: string }[]
	> {
		return this.app.evaluate<
			{ left: number; right: number; top: number; bottom: number; background: string }[]
		>(
			'Array.from(activeDocument.querySelectorAll(".workspace-leaf.mod-active .roamer-thread-highlight")).map((el) => { const box = el.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, background: getComputedStyle(el).backgroundColor }; })',
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
			'app.workspace.activeEditor.editor.cm.dom.classList.contains("roamer-over-item-control")',
		);
	}

	/** Returns the cursor style the window shows at a point. */
	cursorAt(x: number, y: number): Promise<string> {
		return this.app.evaluate<string>(
			`getComputedStyle(activeDocument.elementFromPoint(${x}, ${y})).cursor`,
		);
	}

	/** Returns the indexes of the lines whose bullet is lit. */
	litBulletLines(): Promise<number[]> {
		return this.app.evaluate<number[]>(
			'(() => { const cm = app.workspace.activeEditor.editor.cm; return Array.from(cm.dom.querySelectorAll(".cm-line.roamer-bullet-lit")).map((el) => cm.state.doc.lineAt(cm.posAtDOM(el)).number - 1); })()',
		);
	}

	/** Returns the background color of the dot of the bullet on a line. */
	bulletDotColor(line: number): Promise<string> {
		return this.app.evaluate<string>(
			`(() => { const cm = app.workspace.activeEditor.editor.cm; const el = Array.from(cm.dom.querySelectorAll(".cm-line")).find((row) => cm.state.doc.lineAt(cm.posAtDOM(row)).number - 1 === ${line}); return getComputedStyle(el.querySelector(".list-bullet"), "::after").backgroundColor; })()`,
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
