import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state';
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

	dispatch(spec: TransactionSpec): void {
		this.state = this.state.update(spec).state;
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
