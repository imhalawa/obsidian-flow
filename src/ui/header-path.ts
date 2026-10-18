import { hiddenCrumbs } from './fit-crumbs';
import type { HeaderCrumb } from './header-crumbs';

export const PATH_CLASS = 'flow-crumbs';
export const CRUMB_CLASS = 'flow-crumbs__crumb';
export const MORE_CLASS = 'flow-crumbs__more';
export const HIDDEN_CLASS = 'is-hidden';
export const CURRENT_CLASS = 'is-current';
export const CONTAINER_CLASS = 'flow-has-crumbs';
export const TEXT_CLASS = 'flow-crumbs__text';
export const CUT_CLASS = 'is-cut';
const ABSENT_CLASS = 'is-absent';
const NATURAL_CLASS = 'is-natural';
const MORE_LABEL = '…';
const MORE_DESCRIPTION = 'Show the hidden levels';
const SIGNATURE_ATTRIBUTE = 'data-flow-signature';

export interface HeaderPathHost {
	zoomTo(line: number): void;
	showHidden(crumbs: readonly HeaderCrumb[], anchor: HTMLElement): void;
}

/** Returns the path element a container holds, or null. */
export function pathIn(container: HTMLElement): HTMLElement | null {
	return container.querySelector<HTMLElement>(`:scope > .${PATH_CLASS}`);
}

/** Returns a text that is equal for two paths exactly when they draw the same. */
function signature(crumbs: readonly HeaderCrumb[]): string {
	return JSON.stringify(crumbs.map((crumb) => [crumb.label, crumb.targetLine]));
}

/** Builds the element of one level of the path, with its text in a part that can be cut short. */
function crumbElement(crumb: HeaderCrumb, host: HeaderPathHost): HTMLElement {
	if (crumb.current) {
		const current = createSpan({
			cls: `${CRUMB_CLASS} ${CURRENT_CLASS}`,
			attr: { 'aria-current': 'location' },
		});
		current.createSpan({ cls: TEXT_CLASS, text: crumb.label });
		return current;
	}
	const button = createEl('button', {
		cls: CRUMB_CLASS,
		attr: { type: 'button' },
	});
	button.createSpan({ cls: TEXT_CLASS, text: crumb.label });
	button.addEventListener('click', () => host.zoomTo(crumb.targetLine));
	return button;
}

/** Builds the crumb that stands for the levels that do not fit. */
function moreElement(crumbs: readonly HeaderCrumb[], host: HeaderPathHost): HTMLElement {
	const button = createEl('button', {
		cls: `${CRUMB_CLASS} ${MORE_CLASS} ${HIDDEN_CLASS}`,
		text: MORE_LABEL,
		attr: {
			type: 'button',
			'aria-label': MORE_DESCRIPTION,
			'aria-haspopup': 'menu',
		},
	});
	button.createSpan({ cls: TEXT_CLASS, text: MORE_LABEL });
	button.addEventListener('click', () => {
		const hidden = Array.from(
			button.parentElement?.querySelectorAll<HTMLElement>(
				`.${CRUMB_CLASS}:not(.${MORE_CLASS}).${HIDDEN_CLASS}`,
			) ?? [],
		);
		const levels = hidden
			.map((element) => crumbs[Number(element.dataset.index)])
			.filter((crumb): crumb is HeaderCrumb => crumb !== undefined);
		host.showHidden(levels, button);
	});
	return button;
}

/** Puts the crumbs at the end of a header title container and fits them to the room there. */
export function drawHeaderPath(
	container: HTMLElement,
	crumbs: readonly HeaderCrumb[],
	host: HeaderPathHost,
): void {
	const existing = pathIn(container);
	if (existing?.getAttribute(SIGNATURE_ATTRIBUTE) === signature(crumbs)) {
		fitHeaderPath(container);
		return;
	}
	existing?.remove();
	const path = createEl('nav', {
		cls: PATH_CLASS,
		attr: { 'aria-label': 'Zoom path', [SIGNATURE_ATTRIBUTE]: signature(crumbs) },
	});
	crumbs.forEach((crumb, index) => {
		const element = crumbElement(crumb, host);
		element.dataset.index = String(index);
		path.append(element);
	});
	path.insertBefore(moreElement(crumbs, host), path.children[1] ?? null);
	container.append(path);
	container.classList.add(CONTAINER_CLASS);
	fitHeaderPath(container);
}

/** Removes the path from a header title container. */
export function removeHeaderPath(container: HTMLElement): void {
	pathIn(container)?.remove();
	container.classList.remove(CONTAINER_CLASS);
}

/** Returns the pixels of a computed length, or zero when the length is not a number of pixels. */
function pixels(length: string): number {
	const value = Number.parseFloat(length);
	return Number.isNaN(value) ? 0 : value;
}

/** Returns the width the path may take: what the container has right of the title parts at their natural size. */
function roomForPath(container: HTMLElement, path: HTMLElement): number {
	path.classList.add(ABSENT_CLASS);
	const others = Array.from(container.children).filter((child) => child !== path);
	const last = others[others.length - 1];
	const style = container.ownerDocument.defaultView?.getComputedStyle(container);
	const box = container.getBoundingClientRect();
	path.classList.remove(ABSENT_CLASS);
	if (!last || !style) return container.clientWidth;
	const contentRight =
		box.left + container.clientLeft + container.clientWidth - pixels(style.paddingRight);
	return contentRight - last.getBoundingClientRect().right - pixels(style.columnGap);
}

/** Hides the middle levels, from the second one on, until the path fits in the room the title leaves. */
export function fitHeaderPath(container: HTMLElement): void {
	const path = pathIn(container);
	if (!path) return;
	const more = path.querySelector<HTMLElement>(`.${MORE_CLASS}`);
	const levels = Array.from(
		path.querySelectorAll<HTMLElement>(`.${CRUMB_CLASS}:not(.${MORE_CLASS})`),
	);
	if (!more) return;
	const room = roomForPath(container, path);
	for (const level of levels) level.classList.remove(HIDDEN_CLASS);
	more.classList.remove(HIDDEN_CLASS);
	path.classList.add(NATURAL_CLASS);
	const ellipsisWidth = more.offsetWidth;
	const widths = levels.map((level) => level.offsetWidth);
	path.classList.remove(NATURAL_CLASS);
	more.classList.add(HIDDEN_CLASS);
	const hidden = hiddenCrumbs(widths, ellipsisWidth, room);
	for (const index of hidden) levels[index]?.classList.add(HIDDEN_CLASS);
	more.classList.toggle(HIDDEN_CLASS, hidden.length === 0);
	markCutCrumbs(levels);
}

/** Marks the shown levels whose text is cut short, so hovering them can show it in full. */
function markCutCrumbs(levels: readonly HTMLElement[]): void {
	for (const level of levels) {
		const text = level.querySelector<HTMLElement>(`.${TEXT_CLASS}`);
		const cut =
			!level.classList.contains(HIDDEN_CLASS) &&
			!!text &&
			text.scrollWidth > text.clientWidth;
		level.classList.toggle(CUT_CLASS, cut);
	}
}
