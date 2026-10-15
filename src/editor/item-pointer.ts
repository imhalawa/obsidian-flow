import type { Extension, Text } from '@codemirror/state';
import { ViewPlugin, type EditorView } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { itemStartingAt } from '../outline/item-lookup';
import { parseOutline, type OutlineNode, type OutlineTree } from '../outline/outline-tree';
import {
	bulletMarker,
	containsX,
	expandToMinimumWidth,
	threadParent,
	type Interval,
} from '../outline/pointer-hit';
import {
	ITEM_MENU_TITLES,
	itemMenuActions,
	type ItemMenuAction,
	type ItemMenuEntry,
} from '../ui/item-menu-model';
import { isFolded, toggleBranch } from './fold-control';
import { dispatchZoom } from './zoom-control';
import { zoomField } from './zoom-field';

export interface ItemPointerHost {
	isBulletZoomEnabled: () => boolean;
	isThreadFoldEnabled: () => boolean;
	copyLink: (view: EditorView, startLine: number) => void;
	showMenu: (event: MouseEvent, entries: ItemMenuEntry[]) => void;
}

type PointerHit = { kind: 'bullet'; startLine: number } | { kind: 'thread'; parent: OutlineNode };

const MINIMUM_HIT_WIDTH = 24;
const OVER_ITEM_CLASS = 'flow-over-item-control';
const trees = new WeakMap<Text, OutlineTree>();

/** Returns the outline of the note, parsed once for each version of the text. */
function outlineOf(view: EditorView): OutlineTree {
	const cached = trees.get(view.state.doc);
	if (cached) return cached;
	const tree = parseOutline(view.state.doc.toJSON(), view.state.tabSize);
	trees.set(view.state.doc, tree);
	return tree;
}

/** Returns the horizontal span of the marker of an item on its line, or null when it is not drawn. */
function markerSpan(
	view: EditorView,
	startLine: number,
	from: number,
	to: number,
): Interval | null {
	const line = view.state.doc.line(startLine + 1);
	const start = view.coordsAtPos(line.from + from);
	const end = view.coordsAtPos(line.from + to);
	if (!start || !end) return null;
	return { left: start.left, right: end.left };
}

/** Returns the vertical span of the first row of a line, or null when it is not drawn. */
function firstRow(view: EditorView, startLine: number): { top: number; bottom: number } | null {
	const coords = view.coordsAtPos(view.state.doc.line(startLine + 1).from);
	return coords ? { top: coords.top, bottom: coords.bottom } : null;
}

/** Finds the bullet or thread line under the pointer, or null. */
function hitAt(view: EditorView, event: MouseEvent, host: ItemPointerHost): PointerHit | null {
	if (!view.state.field(editorLivePreviewField, false)) return null;
	if (view.state.field(zoomField, false) === undefined) return null;
	const position = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
	const block = view.lineBlockAt(position);
	const offset = event.clientY - view.documentTop;
	if (offset < block.top || offset > block.bottom) return null;
	const lineIndex = view.state.doc.lineAt(position).number - 1;
	const tree = outlineOf(view);
	const marker = bulletMarker(tree, lineIndex);
	const row = firstRow(view, lineIndex);
	if (host.isBulletZoomEnabled() && marker && row && event.clientY <= row.bottom) {
		const span = markerSpan(view, lineIndex, marker.from, marker.to);
		if (span && containsX(expandToMinimumWidth(span, MINIMUM_HIT_WIDTH), event.clientX)) {
			return { kind: 'bullet', startLine: lineIndex };
		}
	}
	if (!host.isThreadFoldEnabled()) return null;
	const parent = threadParent(
		tree,
		lineIndex,
		event.clientX,
		(candidate) => {
			const span = markerSpan(
				view,
				candidate.startLine,
				candidate.indent.length,
				candidate.indent.length + candidate.marker.length,
			);
			return span ? (span.left + span.right) / 2 : null;
		},
		MINIMUM_HIT_WIDTH / 2,
	);
	return parent ? { kind: 'thread', parent } : null;
}

/** Runs one action of the item menu on the item that starts on a line. */
function perform(
	view: EditorView,
	host: ItemPointerHost,
	action: ItemMenuAction,
	startLine: number,
): void {
	if (action === 'zoom') dispatchZoom(view, startLine, 'visit');
	else if (action === 'copy-link') host.copyLink(view, startLine);
	else toggleBranch(view, startLine, false);
}

/** Builds the menu entries of the item that starts on a line. */
function menuEntries(view: EditorView, host: ItemPointerHost, startLine: number): ItemMenuEntry[] {
	const item = itemStartingAt(outlineOf(view), startLine);
	if (!item) return [];
	return itemMenuActions(item.children.length > 0, isFolded(view.state, startLine)).map(
		(action) => ({
			title: ITEM_MENU_TITLES[action],
			run: () => perform(view, host, action, startLine),
		}),
	);
}

/** Returns the extension that zooms on a bullet click, folds on a thread line click and opens the item menu. */
export function itemPointer(host: ItemPointerHost): Extension {
	return ViewPlugin.define((view) => {
		let claimedPress = false;
		const claim = (event: Event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
		};
		const isPlainPress = (event: MouseEvent) =>
			event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey;
		const listeners: Record<string, (event: MouseEvent) => void> = {
			mousedown(event) {
				claimedPress = false;
				if (!isPlainPress(event)) return;
				const hit = hitAt(view, event, host);
				if (!hit) return;
				if (hit.kind === 'bullet') {
					if (event.altKey) return;
					dispatchZoom(view, hit.startLine, 'visit');
				} else {
					toggleBranch(view, hit.parent.startLine, event.altKey);
				}
				claimedPress = true;
				claim(event);
			},
			click(event) {
				if (!claimedPress) return;
				claimedPress = false;
				claim(event);
			},
			contextmenu(event) {
				const hit = hitAt(view, event, host);
				if (hit?.kind !== 'bullet') return;
				claim(event);
				host.showMenu(event, menuEntries(view, host, hit.startLine));
			},
			mousemove(event) {
				const over = event.buttons === 0 && hitAt(view, event, host) !== null;
				view.dom.classList.toggle(OVER_ITEM_CLASS, over);
			},
			mouseleave() {
				view.dom.classList.remove(OVER_ITEM_CLASS);
			},
		};
		for (const [type, listener] of Object.entries(listeners)) {
			view.dom.addEventListener(type, listener as EventListener, true);
		}
		return {
			destroy() {
				for (const [type, listener] of Object.entries(listeners)) {
					view.dom.removeEventListener(type, listener as EventListener, true);
				}
				view.dom.classList.remove(OVER_ITEM_CLASS);
			},
		};
	});
}
