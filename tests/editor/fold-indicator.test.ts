import { describe, expect, it } from 'vitest';
import { isOverFoldIndicator } from '../../src/editor/fold-indicator';

const insideIndicator = {
	closest: (selector: string) => (selector === '.cm-fold-indicator' ? {} : null),
};
const outsideIndicator = { closest: () => null };

describe('isOverFoldIndicator', () => {
	it('is true for an element inside the fold arrow of Obsidian', () => {
		expect(isOverFoldIndicator(insideIndicator)).toBe(true);
	});

	it('is false for an element outside the fold arrow', () => {
		expect(isOverFoldIndicator(outsideIndicator)).toBe(false);
	});

	it.each([
		['no target', null],
		['a target that is not an element', {}],
	])('is false for %s', (_name, target) => {
		expect(isOverFoldIndicator(target)).toBe(false);
	});
});
