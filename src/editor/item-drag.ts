import type { Extension } from '@codemirror/state';
import { ViewPlugin, type EditorView } from '@codemirror/view';
import type { LineSpan } from '../outline/drop-target';
import { itemStartingAt } from '../outline/item-lookup';
import type { DropDestination } from '../outline/move-subtree';
import { refusalMessage } from '../ui/refusal-messages';
import { dragHandles } from './drag-handles';
import { destinationAt } from './drag-hover';
import { dropAcross, dropWithin } from './drag-move';
import { dropIndicator, setDropIndicator } from './drop-indicator';
import { outlineOfState } from './outline-of-state';

export interface ItemDragHost {
	isEnabled: () => boolean;
	fileOf: (view: EditorView) => string | null;
	notify: (message: string) => void;
}

interface DragSession {
	source: EditorView;
	sourceLine: number;
	span: LineSpan;
	over: EditorView | null;
	destination: DropDestination | null;
}

const DRAGGING_CLASS = 'flow-is-dragging';
const views = new Set<EditorView>();

/** Finds the editor under a point of the window, among the editors in the same window as the dragged one. */
function viewAt(source: EditorView, x: number, y: number): EditorView | null {
	for (const view of views) {
		if (view.dom.ownerDocument !== source.dom.ownerDocument) continue;
		const box = view.dom.getBoundingClientRect();
		if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return view;
	}
	return null;
}

/** Tells whether two editors show the same text of the same file, so a drop between them is a plain move. */
function sameNote(host: ItemDragHost, first: EditorView, second: EditorView): boolean {
	if (first === second) return true;
	const path = host.fileOf(first);
	return path !== null && path === host.fileOf(second) && first.state.doc.eq(second.state.doc);
}

/** Shows the drop indicator in one editor and takes it away from the editor that had it. */
function showIndicator(
	session: DragSession,
	view: EditorView | null,
	destination: DropDestination | null,
): void {
	const same =
		session.over === view &&
		session.destination?.kind === destination?.kind &&
		session.destination?.targetLine === destination?.targetLine;
	if (same) return;
	if (session.over && session.over !== view) {
		session.over.dispatch({ effects: setDropIndicator.of(null) });
	}
	if (view) view.dispatch({ effects: setDropIndicator.of(destination) });
	session.over = view;
	session.destination = destination;
}

/** Moves the dragged item to where the indicator shows. */
function drop(host: ItemDragHost, session: DragSession): void {
	const target = session.over;
	const destination = session.destination;
	if (!target || !destination) return;
	const outcome = sameNote(host, session.source, target)
		? dropWithin(session.source, session.sourceLine, destination)
		: dropAcross(session.source, session.sourceLine, target, destination);
	if (!outcome.ok) host.notify(refusalMessage(outcome.reason));
}

/** Follows one drag from the press on a grip to the release. */
function beginDrag(host: ItemDragHost, view: EditorView, event: PointerEvent, grip: HTMLElement) {
	if (event.button !== 0) return;
	const sourceLine = view.state.doc.lineAt(view.posAtDOM(grip)).number - 1;
	const item = itemStartingAt(outlineOfState(view.state), sourceLine);
	if (!item) return;
	event.preventDefault();
	const session: DragSession = {
		source: view,
		sourceLine,
		span: { startLine: item.startLine, endLine: item.endLine },
		over: null,
		destination: null,
	};
	const document = view.dom.ownerDocument;
	grip.setPointerCapture(event.pointerId);
	for (const each of views) each.dom.classList.add(DRAGGING_CLASS);
	const move = (moved: PointerEvent) => {
		const found = viewAt(view, moved.clientX, moved.clientY);
		const span = found && sameNote(host, view, found) ? session.span : null;
		const destination = found ? destinationAt(found, span, moved.clientX, moved.clientY) : null;
		showIndicator(session, destination ? found : null, destination);
	};
	const finish = (released: PointerEvent | null) => {
		grip.removeEventListener('pointermove', move);
		grip.removeEventListener('pointerup', finish);
		grip.removeEventListener('pointercancel', cancel);
		document.removeEventListener('keydown', escape, true);
		for (const each of views) each.dom.classList.remove(DRAGGING_CLASS);
		if (released) drop(host, session);
		showIndicator(session, null, null);
	};
	const cancel = () => finish(null);
	const escape = (pressed: KeyboardEvent) => {
		if (pressed.key !== 'Escape') return;
		pressed.stopPropagation();
		cancel();
	};
	grip.addEventListener('pointermove', move);
	grip.addEventListener('pointerup', finish);
	grip.addEventListener('pointercancel', cancel);
	document.addEventListener('keydown', escape, true);
}

/** Returns the extension that lets the user drag an item by its handle to a new place. */
export function itemDrag(host: ItemDragHost): Extension {
	return [
		dropIndicator(),
		dragHandles(host.isEnabled, (view, event, grip) => beginDrag(host, view, event, grip)),
		ViewPlugin.define((view) => {
			views.add(view);
			return {
				destroy() {
					views.delete(view);
				},
			};
		}),
	];
}
