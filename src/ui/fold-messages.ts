import type { FoldOutcome } from '../editor/fold-control';

export type FoldAction = 'fold' | 'unfold';

/** Returns the notice for a fold outcome, or null when nothing needs saying. */
export function foldOutcomeMessage(outcome: FoldOutcome, action: FoldAction): string | null {
	if (outcome === 'not-a-list-item') return 'Place the cursor in a list item.';
	if (outcome === 'no-children') return `This item has no children to ${action}.`;
	return null;
}
