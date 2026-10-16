import { zoomOutcomeMessage } from '../ui/zoom-messages';
import { canStep, stepHistory, type HistoryDirection, type ZoomTarget } from './zoom-control';

/** Steps the zoom history of an editor and returns whether it moved; null means there is no editor. */
export function stepZoomHistory(
	target: ZoomTarget | null,
	direction: HistoryDirection,
	notify: (message: string) => void,
): boolean {
	if (!target || !canStep(target, direction)) return false;
	const message = zoomOutcomeMessage(stepHistory(target, direction));
	if (message) notify(message);
	return true;
}
