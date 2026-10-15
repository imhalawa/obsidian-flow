import type { Breadcrumb } from '../outline/zoom';

export interface CrumbItem {
	label: string;
	description: string;
	targetLine: number | null;
	current: boolean;
}

const HOME_LABEL = 'Home';
const EMPTY_LABEL = 'Empty item';

/** Returns what to draw for the breadcrumb path: a home crumb, then one crumb per ancestor. */
export function crumbItems(path: readonly Breadcrumb[]): CrumbItem[] {
	const home: CrumbItem = {
		label: HOME_LABEL,
		description: 'Zoom out to the whole note',
		targetLine: null,
		current: false,
	};
	const items = path.map((crumb, index): CrumbItem => {
		const label = crumb.text === '' ? EMPTY_LABEL : crumb.text;
		return {
			label,
			description: `Zoom out to ${label}`,
			targetLine: crumb.startLine,
			current: index === path.length - 1,
		};
	});
	return [home, ...items];
}
