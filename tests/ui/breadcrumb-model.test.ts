import { describe, expect, it } from 'vitest';
import { crumbItems } from '../../src/ui/breadcrumb-model';

describe('crumbItems', () => {
	it('starts with a home crumb that zooms out to the whole note', () => {
		expect(crumbItems([{ text: 'a', startLine: 1 }])[0]).toEqual({
			label: 'Home',
			description: 'Zoom out to the whole note',
			targetLine: null,
			current: false,
		});
	});

	it('adds one crumb per ancestor and marks only the last one as current', () => {
		const items = crumbItems([
			{ text: 'a', startLine: 1 },
			{ text: 'b', startLine: 2 },
		]);
		expect(items.map((item) => [item.label, item.targetLine, item.current])).toEqual([
			['Home', null, false],
			['a', 1, false],
			['b', 2, true],
		]);
	});

	it('describes what a crumb does', () => {
		expect(crumbItems([{ text: 'a', startLine: 1 }])[1]?.description).toBe('Zoom out to a');
	});

	it('names an empty item', () => {
		const item = crumbItems([{ text: '', startLine: 4 }])[1];
		expect(item?.label).toBe('Empty item');
		expect(item?.description).toBe('Zoom out to Empty item');
	});

	it('shows only the home crumb for an empty path', () => {
		expect(crumbItems([])).toHaveLength(1);
	});
});
