import type { MarkdownView } from 'obsidian';
import { dispatchZoom, isZoomed, zoomTargetOf, type ZoomTarget } from './zoom-control';

const TITLE_SELECTOR = '.view-header-title';
export const TITLE_LINK_CLASS = 'flow-title-link';
const bound = new WeakSet<HTMLElement>();

/** Returns the zoom target of a view when it is zoomed into an item, or null. */
function zoomedTarget(view: MarkdownView): ZoomTarget | null {
	const target = zoomTargetOf(view.editor);
	return target && isZoomed(target) ? target : null;
}

/** Starts listening on a title so that, while its note is zoomed, a click or Enter shows the whole note. */
function bindTitle(title: HTMLElement, view: MarkdownView): void {
	if (bound.has(title)) return;
	bound.add(title);
	const showWholeNote = (event: Event): boolean => {
		const target = zoomedTarget(view);
		if (!target) return false;
		event.preventDefault();
		event.stopPropagation();
		dispatchZoom(target, null, 'visit');
		return true;
	};
	title.addEventListener(
		'mousedown',
		(event) => {
			if (zoomedTarget(view)) {
				event.preventDefault();
				event.stopPropagation();
			}
		},
		true,
	);
	title.addEventListener('click', (event) => void showWholeNote(event), true);
	title.addEventListener(
		'keydown',
		(event) => {
			if (event.key === 'Enter') void showWholeNote(event);
		},
		true,
	);
}

/** Makes the note title in the header show the whole note when clicked while the note is zoomed. */
export function syncTitleLink(view: MarkdownView): void {
	const title = view.containerEl.querySelector<HTMLElement>(TITLE_SELECTOR);
	if (!title) return;
	bindTitle(title, view);
	title.classList.toggle(TITLE_LINK_CLASS, zoomedTarget(view) !== null);
}

/** Returns the note title to its native look. */
export function clearTitleLink(view: MarkdownView): void {
	view.containerEl.querySelector<HTMLElement>(TITLE_SELECTOR)?.classList.remove(TITLE_LINK_CLASS);
}
