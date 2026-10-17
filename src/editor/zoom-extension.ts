import { Prec, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { hiddenDecorations } from './zoom-decorations';
import { zoomField } from './zoom-field';
import { zoomEditFilter } from './zoom-filter';
import { zoomFoldGuard } from './zoom-fold-guard';
import { zoomHistoryField } from './zoom-history-field';
import { zoomRemovedNotifier } from './zoom-removed';

/** Returns the editor extension that adds zooming; the callback runs when a zoomed item is removed. */
export function zoomExtension(onZoomRemoved: () => void): Extension {
	return [
		zoomField,
		zoomHistoryField,
		zoomEditFilter,
		zoomFoldGuard,
		Prec.highest(EditorView.decorations.compute([zoomField], hiddenDecorations)),
		EditorView.atomicRanges.of((view) => hiddenDecorations(view.state)),
		zoomRemovedNotifier(onZoomRemoved),
	];
}
