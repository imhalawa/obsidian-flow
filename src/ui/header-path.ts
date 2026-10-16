import { hiddenCrumbs } from './fit-crumbs';
import type { HeaderCrumb } from './header-crumbs';

export const PATH_CLASS = 'flow-crumbs';
export const CRUMB_CLASS = 'flow-crumbs__crumb';
export const MORE_CLASS = 'flow-crumbs__more';
export const HIDDEN_CLASS = 'is-hidden';
export const CURRENT_CLASS = 'is-current';
export const CONTAINER_CLASS = 'flow-has-crumbs';
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

/** Builds the element of one level of the path. */
function crumbElement(crumb: HeaderCrumb, host: HeaderPathHost): HTMLElement {
	if (crumb.current) {
		return createSpan({
			cls: `${CRUMB_CLASS} ${CURRENT_CLASS}`,
			text: crumb.label,
			attr: { 'aria-current': 'location', 'aria-label': crumb.label, title: crumb.label },
		});
	}
	const button = createEl('button', {
		cls: CRUMB_CLASS,
		text: crumb.label,
		attr: { type: 'button', 'aria-label': crumb.description, title: crumb.label },
	});
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

/** Hides the middle levels, from the second one on, until the path fits in the room the title leaves. */
export function fitHeaderPath(container: HTMLElement): void {
	const path = pathIn(container);
	if (!path) return;
	const more = path.querySelector<HTMLElement>(`.${MORE_CLASS}`);
	const levels = Array.from(
		path.querySelectorAll<HTMLElement>(`.${CRUMB_CLASS}:not(.${MORE_CLASS})`),
	);
	if (!more) return;
	for (const level of levels) level.classList.remove(HIDDEN_CLASS);
	more.classList.remove(HIDDEN_CLASS);
	const ellipsisWidth = more.scrollWidth;
	more.classList.add(HIDDEN_CLASS);
	const others = Array.from(container.children).filter((child) => child !== path);
	const taken = others.reduce((sum, child) => sum + child.scrollWidth, 0);
	const hidden = hiddenCrumbs(
		levels.map((level) => level.scrollWidth),
		ellipsisWidth,
		container.clientWidth - taken,
	);
	for (const index of hidden) levels[index]?.classList.add(HIDDEN_CLASS);
	more.classList.toggle(HIDDEN_CLASS, hidden.length === 0);
}
