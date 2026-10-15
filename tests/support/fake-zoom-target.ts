import {
	EditorSelection,
	EditorState,
	type Transaction,
	type TransactionSpec,
} from '@codemirror/state';
import { zoomField } from '../../src/editor/zoom-field';
import { zoomEditFilter } from '../../src/editor/zoom-filter';
import { zoomHistoryField } from '../../src/editor/zoom-history-field';
import type { ZoomTarget } from '../../src/editor/zoom-control';

/** An editor state with the zoom extension, standing in for an editor view. */
export class FakeZoomTarget implements ZoomTarget {
	state: EditorState;

	constructor(doc: string, caret: number) {
		this.state = EditorState.create({
			doc,
			selection: EditorSelection.cursor(caret),
			extensions: [zoomField, zoomHistoryField, zoomEditFilter],
		});
	}

	private readonly listeners: ((
		before: EditorState,
		after: EditorState,
		transactions: readonly Transaction[],
	) => void)[] = [];

	onUpdate(
		listener: (
			before: EditorState,
			after: EditorState,
			transactions: readonly Transaction[],
		) => void,
	): void {
		this.listeners.push(listener);
	}

	readonly dispatched: TransactionSpec[] = [];

	dispatch(spec: TransactionSpec): void {
		this.dispatched.push(spec);
		const before = this.state;
		const transaction = before.update(spec);
		this.state = transaction.state;
		for (const listener of this.listeners) listener(before, this.state, [transaction]);
	}

	get text(): string {
		return this.state.doc.toString();
	}

	get caret(): number {
		return this.state.selection.main.head;
	}

	get zoom() {
		return this.state.field(zoomField);
	}
}
