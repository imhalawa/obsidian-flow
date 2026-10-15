import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { hiddenDecorations, zoomDecorations } from './zoom-decorations';
import { zoomField } from './zoom-field';
import { zoomEditFilter } from './zoom-filter';
import { zoomHistoryField } from './zoom-history-field';
import { zoomRemovedNotifier } from './zoom-removed';

/** Returns the editor extension that adds zooming; the callback runs when a zoomed item is removed. */
export function zoomExtension(onZoomRemoved: () => void): Extension {
	return [
		zoomField,
		zoomHistoryField,
		zoomEditFilter,
		EditorView.decorations.compute([zoomField], zoomDecorations),
		EditorView.atomicRanges.of((view) => hiddenDecorations(view.state)),
		zoomRemovedNotifier(onZoomRemoved),
	];
}
