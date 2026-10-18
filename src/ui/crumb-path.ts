import { hiddenCrumbs } from './fit-crumbs';
import type { PanelCrumb } from './panel-crumbs';

export const PATH_CLASS = 'roamer-crumbs';
export const CRUMB_CLASS = 'roamer-crumbs__crumb';
export const ROOT_CLASS = 'is-root';
export const MORE_CLASS = 'roamer-crumbs__more';
export const HIDDEN_CLASS = 'is-hidden';
export const CURRENT_CLASS = 'is-current';
export const TEXT_CLASS = 'roamer-crumbs__text';
export const CUT_CLASS = 'is-cut';
const ABSENT_CLASS = 'is-absent';
const NATURAL_CLASS = 'is-natural';
const MORE_LABEL = '…';
const MORE_DESCRIPTION = 'Show the hidden levels';

export interface CrumbPathHost {
	zoomTo(line: number | null): void;
	showHidden(crumbs: readonly PanelCrumb[], anchor: HTMLElement): void;
}

/** Builds the element of one crumb, with its text in a part that can be cut short. */
function crumbElement(crumb: PanelCrumb, host: CrumbPathHost): HTMLElement {
	if (crumb.current) {
		const current = createSpan({
			cls: `${CRUMB_CLASS} ${CURRENT_CLASS}`,
			attr: { 'aria-current': 'location' },
		});
		current.createSpan({ cls: TEXT_CLASS, text: crumb.label });
		return current;
	}
	const button = createEl('button', {
		cls: crumb.root ? `${CRUMB_CLASS} ${ROOT_CLASS}` : CRUMB_CLASS,
		attr: { type: 'button' },
	});
	button.createSpan({ cls: TEXT_CLASS, text: crumb.label });
	button.addEventListener('click', () => host.zoomTo(crumb.targetLine));
	return button;
}

/** Builds the crumb that stands for the levels that do not fit. */
function moreElement(levels: readonly PanelCrumb[], host: CrumbPathHost): HTMLElement {
	const button = createEl('button', {
		cls: `${CRUMB_CLASS} ${MORE_CLASS} ${HIDDEN_CLASS}`,
		text: MORE_LABEL,
		attr: {
			type: 'button',
			'aria-label': MORE_DESCRIPTION,
			'aria-haspopup': 'menu',
		},
	});
	button.addEventListener('click', () => {
		const hidden = Array.from(
			button.parentElement?.querySelectorAll<HTMLElement>(
				`.${CRUMB_CLASS}:not(.${MORE_CLASS}):not(.${ROOT_CLASS}).${HIDDEN_CLASS}`,
			) ?? [],
		);
		const hiddenLevels = hidden
			.map((element) => levels[Number(element.dataset.index)])
			.filter((crumb): crumb is PanelCrumb => crumb !== undefined);
		host.showHidden(hiddenLevels, button);
	});
	return button;
}

/** Builds the path: the note crumb, the first level, a crumb for hidden levels and the rest. */
export function createCrumbPath(crumbs: readonly PanelCrumb[], host: CrumbPathHost): HTMLElement {
	const levels = crumbs.filter((crumb) => !crumb.root);
	const path = createEl('nav', { cls: PATH_CLASS, attr: { 'aria-label': 'Zoom path' } });
	for (const crumb of crumbs) {
		const element = crumbElement(crumb, host);
		if (!crumb.root) element.dataset.index = String(levels.indexOf(crumb));
		path.append(element);
	}
	path.insertBefore(moreElement(levels, host), path.children[2] ?? null);
	return path;
}

/** Returns the pixels of a computed length, or zero when the length is not a number of pixels. */
function pixels(length: string): number {
	const value = Number.parseFloat(length);
	return Number.isNaN(value) ? 0 : value;
}

/** Returns the width the path may take: the content width of its panel. */
function roomForPath(path: HTMLElement): number {
	const panel = path.parentElement;
	const style = path.ownerDocument.defaultView?.getComputedStyle(panel ?? path);
	if (!panel || !style) return path.clientWidth;
	return panel.clientWidth - pixels(style.paddingLeft) - pixels(style.paddingRight);
}

/** Hides the middle levels, from the second one on, until the path fits in its panel. */
export function fitCrumbPath(path: HTMLElement): void {
	const more = path.querySelector<HTMLElement>(`.${MORE_CLASS}`);
	const root = path.querySelector<HTMLElement>(`.${ROOT_CLASS}`);
	const levels = Array.from(
		path.querySelectorAll<HTMLElement>(
			`.${CRUMB_CLASS}:not(.${MORE_CLASS}):not(.${ROOT_CLASS})`,
		),
	);
	if (!more) return;
	path.classList.add(ABSENT_CLASS);
	const room = roomForPath(path);
	path.classList.remove(ABSENT_CLASS);
	for (const level of levels) level.classList.remove(HIDDEN_CLASS);
	more.classList.remove(HIDDEN_CLASS);
	path.classList.add(NATURAL_CLASS);
	const ellipsisWidth = more.offsetWidth;
	const rootWidth = root ? root.offsetWidth : 0;
	const widths = levels.map((level) => level.offsetWidth);
	path.classList.remove(NATURAL_CLASS);
	more.classList.add(HIDDEN_CLASS);
	const hidden = hiddenCrumbs(widths, ellipsisWidth, room - rootWidth);
	for (const index of hidden) levels[index]?.classList.add(HIDDEN_CLASS);
	more.classList.toggle(HIDDEN_CLASS, hidden.length === 0);
	markCutCrumbs(root ? [root, ...levels] : levels);
}

/** Marks the shown crumbs whose text is cut short, so hovering them can show it in full. */
function markCutCrumbs(crumbs: readonly HTMLElement[]): void {
	for (const crumb of crumbs) {
		const text = crumb.querySelector<HTMLElement>(`.${TEXT_CLASS}`);
		const cut =
			!crumb.classList.contains(HIDDEN_CLASS) &&
			!!text &&
			text.scrollWidth > text.clientWidth;
		crumb.classList.toggle(CUT_CLASS, cut);
	}
}
