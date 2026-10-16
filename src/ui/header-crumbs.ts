import { stripBlockId } from '../outline/block-id';
import { stripInlineMarkdown } from '../outline/inline-markdown';
import type { Breadcrumb } from '../outline/zoom';

export interface HeaderCrumb {
	label: string;
	targetLine: number;
	current: boolean;
}

const EMPTY_LABEL = 'Empty item';

/** Returns what to draw in the note header for the zoom path: one crumb per level, the last one current. */
export function headerCrumbs(path: readonly Breadcrumb[]): HeaderCrumb[] {
	return path.map((crumb, index) => {
		const text = stripInlineMarkdown(stripBlockId(crumb.text));
		const label = text === '' ? EMPTY_LABEL : text;
		return {
			label,
			targetLine: crumb.startLine,
			current: index === path.length - 1,
		};
	});
}
