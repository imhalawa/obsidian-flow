import { describe, expect, it } from 'vitest';
import { refusalMessage } from '../../src/ui/refusal-messages';

describe('refusalMessage', () => {
	it.each([
		['not-a-list-item', 'Place the cursor in a list item.'],
		['no-previous-sibling', 'This item is the first one at its level.'],
		['no-next-sibling', 'This item is the last one at its level.'],
		['top-level', 'This item is already at the top level.'],
		[
			'structure-check-failed',
			'Could not change the list safely, so the note was left as it is.',
		],
	] as const)('explains %s', (reason, message) => {
		expect(refusalMessage(reason)).toBe(message);
	});
});
