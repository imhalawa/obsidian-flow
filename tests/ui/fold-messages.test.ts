import { describe, expect, it } from 'vitest';
import { foldOutcomeMessage } from '../../src/ui/fold-messages';

describe('foldOutcomeMessage', () => {
	it.each(['fold', 'unfold'] as const)('asks for a list item when %s has none', (action) => {
		expect(foldOutcomeMessage('not-a-list-item', action)).toBe(
			'Place the cursor in a list item.',
		);
	});

	it.each([
		['fold', 'This item has no children to fold.'],
		['unfold', 'This item has no children to unfold.'],
	] as const)('explains a leaf when trying to %s', (action, message) => {
		expect(foldOutcomeMessage('no-children', action)).toBe(message);
	});

	it.each(['fold', 'unfold'] as const)('says nothing when %s worked', (action) => {
		expect(foldOutcomeMessage('done', action)).toBeNull();
	});
});
