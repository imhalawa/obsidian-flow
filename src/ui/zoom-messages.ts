import type { ZoomOutcome } from '../editor/zoom-control';

export const ZOOM_REMOVED_MESSAGE = 'Zoomed item was removed. Showing the full note.';
export const ZOOM_NO_ITEM_MESSAGE = 'Place the cursor in a list item or a heading to zoom.';

/** Returns the notice for a zoom outcome, or null when nothing needs saying. */
export function zoomOutcomeMessage(outcome: ZoomOutcome): string | null {
	if (outcome === 'nothing-to-zoom') return ZOOM_NO_ITEM_MESSAGE;
	if (outcome === 'item-removed') return ZOOM_REMOVED_MESSAGE;
	return null;
}
