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
				await app.workspace.getLeaf(false).openFile(file);
				return true;
			})()`,
		);
		await app.evaluate(
			`new Promise((resolve) => { const check = () => app.workspace.activeEditor?.editor ? resolve(true) : setTimeout(check, 50); check(); })`,
		);
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
}
