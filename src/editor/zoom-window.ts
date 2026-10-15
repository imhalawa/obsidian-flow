import type { LineRange } from '../outline/selection';
import { zoomTargetOf } from './zoom-control';
import { zoomField } from './zoom-field';

/** Returns the lines the zoom shows, or null when the editor is not zoomed. */
export function zoomedLines(editor: object): LineRange | null {
	const target = zoomTargetOf(editor);
	const zoom = target?.state.field(zoomField);
	if (!target || !zoom) return null;
	const doc = target.state.doc;
	return { fromLine: doc.lineAt(zoom.from).number - 1, toLine: doc.lineAt(zoom.to).number - 1 };
}
