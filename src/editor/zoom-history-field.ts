import { StateField } from '@codemirror/state';
import { goBack, goForward, newHistory, visit, type ZoomHistory } from '../outline/zoom-history';
import { changeIn, zoomField, type ZoomNavigation } from './zoom-field';

const MAX_HISTORY_ENTRIES = 50;

export type ZoomEntry = number | null;

type HistoryStep = (
	history: ZoomHistory<ZoomEntry>,
	zoomStart: ZoomEntry,
) => ZoomHistory<ZoomEntry>;

const sameEntry = (a: ZoomEntry, b: ZoomEntry): boolean => a === b;

const STEPS: Record<ZoomNavigation, HistoryStep> = {
	visit: (history, zoomStart) => visit(history, zoomStart, sameEntry, MAX_HISTORY_ENTRIES),
	back: (history) => goBack(history),
	forward: (history) => goForward(history),
};

export const zoomHistoryField = StateField.define<ZoomHistory<ZoomEntry>>({
	create: () => newHistory<ZoomEntry>(null),
	update(history, transaction) {
		const mapped = transaction.docChanged
			? {
					entries: history.entries.map((entry) =>
						entry === null ? null : transaction.changes.mapPos(entry, 1),
					),
					index: history.index,
				}
			: history;
		const change = changeIn(transaction);
		if (!change) return mapped;
		const zoom = transaction.state.field(zoomField);
		return STEPS[change.navigation](mapped, zoom ? zoom.from : null);
	},
});
