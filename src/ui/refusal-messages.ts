import type { RefusalReason } from '../outline/line-edit';

const MESSAGES: Record<RefusalReason, string> = {
	'not-a-list-item': 'Place the cursor in a list item.',
	'no-previous-sibling': 'This item is the first one at its level.',
	'no-next-sibling': 'This item is the last one at its level.',
	'top-level': 'This item is already at the top level.',
	'outside-zoom': 'That would change items outside the zoomed item. Zoom out first.',
	'drop-into-self': 'An item cannot be dropped inside itself.',
	'structure-check-failed': 'Could not change the list safely, so the note was left as it is.',
};

/** Returns the notice text that explains why an edit was refused. */
export function refusalMessage(reason: RefusalReason): string {
	return MESSAGES[reason];
}
