import type { Extension } from '@codemirror/state';
import { ViewPlugin, type EditorView } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { itemStartingAt } from '../outline/item-lookup';
import type { OutlineNode } from '../outline/outline-tree';
import {
	bulletMarker,
	containsX,
	expandToMinimumWidth,
	hitSizes,
	threadParent,
} from '../outline/pointer-hit';
import {
	ITEM_MENU_TITLES,
	itemMenuActions,
	type ItemMenuAction,
	type ItemMenuEntry,
} from '../ui/item-menu-model';
import { hasStartedDragging, isFinishedPress, type PressPoint } from './bullet-press';
import { showLitBullet, litBulletAt } from './bullet-hover';
import { isFolded, isHiddenByFold, toggleBranch } from './fold-control';
import { foldIndicatorCenter, foldIndicatorOf, isOverFoldIndicator } from './fold-indicator';
import { editorFontSize, firstRow, markerSpan } from './item-geometry';
import { outlineOfState } from './outline-of-state';
import { setThreadHover, threadHoverField } from './thread-hover-field';
import { dispatchZoom } from './zoom-control';
import { zoomField } from './zoom-field';

export interface ItemPointerHost {
	isBulletZoomEnabled: () => boolean;
	isBulletDragEnabled: () => boolean;
	isThreadFoldEnabled: () => boolean;
	beginDrag: (view: EditorView, startLine: number, first: PointerEvent) => void;
	showMenu: (event: MouseEvent, entries: ItemMenuEntry[]) => void;
}

type PointerHit =
	| { kind: 'bullet'; startLine: number }
	| { kind: 'chevron'; startLine: number }
	| { kind: 'thread'; parent: OutlineNode; guideX: number };

const OVER_ITEM_CLASS = 'roamer-over-item-control';
const CHEVRON_HOVER_CLASS = 'roamer-chevron-hover';
/** Returns the horizontal middle of the marker of an item, where its thread line runs, or null when it is not drawn. */
function guideX(view: EditorView, item: OutlineNode): number | null {
	const span = markerSpan(
		view,
		item.startLine,
		item.indent.length,
		item.indent.length + item.marker.length,
	);
	return span ? (span.left + span.right) / 2 : null;
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
	if (isHiddenByFold(view.state, view.state.doc.line(lineIndex + 1).from)) return null;
	const tree = outlineOfState(view.state);
	const marker = bulletMarker(tree, lineIndex);
	const row = firstRow(view, lineIndex);
	const sizes = hitSizes(editorFontSize(view));
	if (
		(host.isBulletZoomEnabled() || host.isBulletDragEnabled()) &&
		marker &&
		row &&
		event.clientY <= row.bottom
	) {
		const span = markerSpan(view, lineIndex, marker.from, marker.to);
		if (span && containsX(expandToMinimumWidth(span, sizes.bulletMinimum), event.clientX)) {
			return { kind: 'bullet', startLine: lineIndex };
		}
	}
	if (isOverFoldIndicator(event.target)) return null;
	const arrowCenter =
		row && event.clientY <= row.bottom
			? foldIndicatorCenter(view, view.state.doc.line(lineIndex + 1).from)
			: null;
	const chevronDistance = arrowCenter === null ? Infinity : Math.abs(event.clientX - arrowCenter);
	const chevron: PointerHit | null =
		chevronDistance <= sizes.chevronHalf ? { kind: 'chevron', startLine: lineIndex } : null;
	if (!host.isThreadFoldEnabled()) return chevron;
	const parent = threadParent(
		tree,
		lineIndex,
		event.clientX,
		(candidate) => guideX(view, candidate),
		sizes.threadHalf,
	);
	const guide = parent ? guideX(view, parent) : null;
	if (!parent || guide === null) return chevron;
	if (chevron && Math.abs(event.clientX - guide) > sizes.threadCore) return chevron;
	return { kind: 'thread', parent, guideX: guide };
}

/** Marks the fold arrow of a line as hovered, or clears the mark when there is none; returns the arrow that is marked. */
function markChevron(
	view: EditorView,
	marked: Element | null,
	hit: PointerHit | null,
): Element | null {
	const next =
		hit?.kind === 'chevron'
			? foldIndicatorOf(view, view.state.doc.line(hit.startLine + 1).from)
			: null;
	if (next === marked) return marked;
	marked?.classList.remove(CHEVRON_HOVER_CLASS);
	next?.classList.add(CHEVRON_HOVER_CLASS);
	return next;
}

/** Highlights the thread line of a hit, or clears the highlight when there is none; does nothing when it is already shown. */
function showThreadHover(
	view: EditorView,
	hit: Extract<PointerHit, { kind: 'thread' }> | null,
): void {
	const next = hit ? { startLine: hit.parent.startLine, x: hit.guideX } : null;
	const current = view.state.field(threadHoverField, false);
	if (current === undefined) return;
	if (current?.startLine === next?.startLine && current?.x === next?.x) return;
	view.dispatch({ effects: setThreadHover.of(next) });
}

/** Runs one action of the item menu on the item that starts on a line. */
function perform(
	view: EditorView,
	host: ItemPointerHost,
	action: ItemMenuAction,
	startLine: number,
): void {
	if (action === 'zoom') dispatchZoom(view, startLine, 'visit');
	else toggleBranch(view, startLine, false);
}

/** Builds the menu entries of the item that starts on a line. */
function menuEntries(view: EditorView, host: ItemPointerHost, startLine: number): ItemMenuEntry[] {
	const item = itemStartingAt(outlineOfState(view.state), startLine);
	if (!item) return [];
	return itemMenuActions(item.children.length > 0, isFolded(view.state, startLine)).map(
		(action) => ({
			title: ITEM_MENU_TITLES[action],
			run: () => perform(view, host, action, startLine),
		}),
	);
}

/** Follows a press on a bullet: a drag once the pointer moves far enough, otherwise a zoom when the button is released. */
function followBulletPress(
	view: EditorView,
	host: ItemPointerHost,
	startLine: number,
	start: PressPoint,
): void {
	const document = view.dom.ownerDocument;
	const stop = () => {
		document.removeEventListener('pointermove', move);
		document.removeEventListener('pointerup', release);
		document.removeEventListener('pointercancel', stop);
	};
	const move = (moved: PointerEvent) => {
		if (moved.pointerType === 'touch' || !host.isBulletDragEnabled()) return;
		if (!hasStartedDragging(start, { x: moved.clientX, y: moved.clientY })) return;
		stop();
		host.beginDrag(view, startLine, moved);
	};
	const release = () => {
		stop();
		if (host.isBulletZoomEnabled()) dispatchZoom(view, startLine, 'visit');
	};
	document.addEventListener('pointermove', move);
	document.addEventListener('pointerup', release);
	document.addEventListener('pointercancel', stop);
}

/** Returns the extension that zooms on a bullet click, starts a drag on a bullet press, folds on a thread line click and opens the item menu. */
export function itemPointer(host: ItemPointerHost): Extension {
	return ViewPlugin.define((view) => {
		let claimedPress = false;
		let lastPointerType = '';
		let markedChevron: Element | null = null;
		const claim = (event: Event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
		};
		const isPlainPress = (event: MouseEvent) =>
			event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey;
		const listeners: Record<string, (event: MouseEvent) => void> = {
			pointerdown(event) {
				lastPointerType = (event as PointerEvent).pointerType;
			},
			mousedown(event) {
				claimedPress = false;
				if (!isPlainPress(event)) return;
				const hit = hitAt(view, event, host);
				if (!hit) return;
				if (hit.kind === 'bullet') {
					if (event.altKey) return;
					if (isFinishedPress(lastPointerType)) {
						if (host.isBulletZoomEnabled()) dispatchZoom(view, hit.startLine, 'visit');
					} else {
						followBulletPress(view, host, hit.startLine, {
							x: event.clientX,
							y: event.clientY,
						});
					}
				} else if (hit.kind === 'chevron') {
					toggleBranch(view, hit.startLine, event.altKey);
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
				const hit = event.buttons === 0 ? hitAt(view, event, host) : null;
				view.dom.classList.toggle(OVER_ITEM_CLASS, hit !== null);
				markedChevron = markChevron(view, markedChevron, hit);
				showThreadHover(view, hit?.kind === 'thread' ? hit : null);
				showLitBullet(
					view,
					hit?.kind === 'thread' || event.buttons !== 0 ? null : litBulletAt(view, event),
				);
			},
			mouseleave() {
				view.dom.classList.remove(OVER_ITEM_CLASS);
				markedChevron = markChevron(view, markedChevron, null);
				showThreadHover(view, null);
				showLitBullet(view, null);
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
				markChevron(view, markedChevron, null);
			},
		};
	});
}
