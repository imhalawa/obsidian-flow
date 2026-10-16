import type { Breadcrumb } from '../outline/zoom';

export interface HeaderCrumb {
	label: string;
	description: string;
	targetLine: number;
	current: boolean;
}

const EMPTY_LABEL = 'Empty item';

/** Returns what to draw in the note header for the zoom path: one crumb per level, the last one current. */
export function headerCrumbs(path: readonly Breadcrumb[]): HeaderCrumb[] {
	return path.map((crumb, index) => {
		const label = crumb.text === '' ? EMPTY_LABEL : crumb.text;
		return {
			label,
			description: `Zoom to ${label}`,
			targetLine: crumb.startLine,
			current: index === path.length - 1,
		};
	});
}
