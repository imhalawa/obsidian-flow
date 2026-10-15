import { describe, expect, it } from 'vitest';
import { zoomOutcomeMessage } from '../../src/ui/zoom-messages';

describe('zoomOutcomeMessage', () => {
	it('asks for a list item when the cursor is not in one', () => {
		expect(zoomOutcomeMessage('not-a-list-item')).toBe(
			'Place the cursor in a list item to zoom.',
		);
	});

	it('says the full note is shown when the zoomed item was removed', () => {
		expect(zoomOutcomeMessage('item-removed')).toBe(
			'Zoomed item was removed. Showing the full note.',
		);
	});

	it('says nothing when the zoom worked', () => {
		expect(zoomOutcomeMessage('done')).toBeNull();
	});
});
