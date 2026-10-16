import { describe, expect, it } from 'vitest';
import { headerCrumbs } from '../../src/ui/header-crumbs';

describe('headerCrumbs', () => {
	it('draws one crumb per level and no home crumb', () => {
		const crumbs = headerCrumbs([
			{ text: 'a', startLine: 1 },
			{ text: 'b', startLine: 2 },
		]);
		expect(crumbs.map((crumb) => [crumb.label, crumb.targetLine, crumb.current])).toEqual([
			['a', 1, false],
			['b', 2, true],
		]);
	});

	it('marks only the last crumb as current', () => {
		const crumbs = headerCrumbs([
			{ text: 'a', startLine: 1 },
			{ text: 'b', startLine: 2 },
			{ text: 'c', startLine: 3 },
		]);
		expect(crumbs.map((crumb) => crumb.current)).toEqual([false, false, true]);
	});

	it('describes what a crumb does', () => {
		expect(headerCrumbs([{ text: 'a', startLine: 1 }])[0]?.description).toBe('Zoom to a');
	});

	it('names an empty item', () => {
		const crumb = headerCrumbs([{ text: '', startLine: 4 }])[0];
		expect(crumb?.label).toBe('Empty item');
		expect(crumb?.description).toBe('Zoom to Empty item');
	});

	it('draws nothing for an empty path', () => {
		expect(headerCrumbs([])).toEqual([]);
	});
});

describe('headerCrumbs formatting', () => {
	it('shows a label without its markdown markers', () => {
		const crumb = headerCrumbs([{ text: "**Garden tasks for spring**", startLine: 1 }])[0];
		expect(crumb?.label).toBe("Garden tasks for spring");
	});

	it('describes the zoom with the cleaned label', () => {
		expect(headerCrumbs([{ text: '**a**', startLine: 1 }])[0]?.description).toBe('Zoom to a');
	});

	it('shows a label without its block id', () => {
		expect(headerCrumbs([{ text: 'Task ^abc123', startLine: 1 }])[0]?.label).toBe('Task');
	});

	it('names an item whose text is only markers', () => {
		expect(headerCrumbs([{ text: '[](https://example.com)', startLine: 1 }])[0]?.label).toBe(
			'Empty item',
		);
	});
});
