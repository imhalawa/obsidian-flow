import type { EditorChange, EditorPosition, EditorRangeOrCaret, EditorTransaction } from 'obsidian';
import type { TreeEditor } from '../../src/editor/tree-edit';

export interface FakeSelection {
	anchor: EditorPosition;
	head: EditorPosition;
}

/** A small in-memory editor that applies Obsidian style transactions. */
export class FakeEditor {
	private lines: string[];
	private selections: FakeSelection[];
	readonly transactions: EditorTransaction[] = [];

	constructor(text: string, selections: FakeSelection[]) {
		this.lines = text.split('\n');
		this.selections = selections;
	}

	get text(): string {
		return this.lines.join('\n');
	}

	get currentSelections(): FakeSelection[] {
		return this.selections;
	}

	getValue(): string {
		return this.text;
	}

	listSelections(): FakeSelection[] {
		return this.selections.map((selection) => ({
			anchor: { ...selection.anchor },
			head: { ...selection.head },
		}));
	}

	transaction(tx: EditorTransaction): void {
		this.transactions.push(tx);
		const changes: EditorChange[] = tx.changes ?? [];
		const ordered = [...changes].sort((a, b) => this.offset(b.from) - this.offset(a.from));
		let text = this.text;
		for (const change of ordered) {
			const from = this.offset(change.from);
			const to = this.offset(change.to ?? change.from);
			text = text.slice(0, from) + change.text + text.slice(to);
		}
		this.lines = text.split('\n');
		const ranges: EditorRangeOrCaret[] = tx.selections ?? [];
		this.selections = ranges.map((range) => ({
			anchor: range.from,
			head: range.to ?? range.from,
		}));
	}

	asEditor(): TreeEditor {
		return this;
	}

	private offset(position: EditorPosition): number {
		let offset = 0;
		for (let line = 0; line < position.line; line += 1)
			offset += (this.lines[line]?.length ?? 0) + 1;
		return offset + position.ch;
	}
}
