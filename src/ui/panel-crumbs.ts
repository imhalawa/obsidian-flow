import { stripBlockId } from '../outline/block-id';
import { stripInlineMarkdown } from '../outline/inline-markdown';
import type { Breadcrumb } from '../outline/zoom';

export interface PanelCrumb {
	label: string;
	targetLine: number | null;
	current: boolean;
	root: boolean;
}

export const EMPTY_ITEM_LABEL = 'Empty item';
export const EMPTY_NOTE_LABEL = 'Note';

/** Returns what the zoom panel draws: the note first, whose click shows the whole note, then one crumb per level with the last one current. */
export function panelCrumbs(noteName: string, path: readonly Breadcrumb[]): PanelCrumb[] {
	const note: PanelCrumb = {
		label: noteName === '' ? EMPTY_NOTE_LABEL : noteName,
		targetLine: null,
		current: false,
		root: true,
	};
	const levels = path.map((crumb, index): PanelCrumb => {
		const text = stripInlineMarkdown(stripBlockId(crumb.text));
		return {
			label: text === '' ? EMPTY_ITEM_LABEL : text,
			targetLine: crumb.startLine,
			current: index === path.length - 1,
			root: false,
		};
	});
	return [note, ...levels];
}
