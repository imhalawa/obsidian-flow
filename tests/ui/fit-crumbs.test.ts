import { describe, expect, it } from 'vitest';
import { hiddenCrumbs } from '../../src/ui/fit-crumbs';

const ELLIPSIS = 20;

describe('hiddenCrumbs', () => {
	it.each([
		['everything fits', [50, 50, 50, 50], 200, []],
		['the room is exactly the total', [50, 50, 50, 50], 200, []],
		['one level has to go', [50, 50, 50, 50], 190, [1]],
		['two levels have to go', [50, 50, 50, 50], 150, [1, 2]],
		['the ellipsis itself needs room', [50, 50, 50, 50], 169, [1, 2]],
		['the ellipsis fits exactly', [50, 50, 50, 50], 170, [1]],
		['five levels, only the middle three can go', [50, 50, 50, 50, 50], 90, [1, 2, 3]],
	])('when %s', (_name, widths, available, expected) => {
		expect(hiddenCrumbs(widths, ELLIPSIS, available)).toEqual(expected);
	});

	it('hides every middle level when nothing fits', () => {
		expect(hiddenCrumbs([50, 50, 50, 50, 50], ELLIPSIS, 0)).toEqual([1, 2, 3]);
	});

	it.each([
		['no levels', []],
		['one level', [500]],
		['two levels', [500, 500]],
	])('never hides the first or the last level with %s', (_name, widths) => {
		expect(hiddenCrumbs(widths, ELLIPSIS, 10)).toEqual([]);
	});

	it('hides from the second level on, so the levels next to the current one stay longest', () => {
		expect(hiddenCrumbs([30, 40, 50, 60, 70], ELLIPSIS, 190)).toEqual([1, 2]);
	});
});
