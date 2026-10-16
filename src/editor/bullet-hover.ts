import type { EditorView } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { bulletMarker, containsX, litInterval } from '../outline/pointer-hit';
import { bulletLightField, setLitBullet } from './bullet-light-field';
import { firstRow, markerSpan } from './item-geometry';
import { outlineOfState } from './outline-of-state';
import { zoomField } from './zoom-field';

const MINIMUM_HIT_WIDTH = 24;
const GUTTER_WIDTH = 48;

/** Finds the line of the item whose bullet the pointer is on or beside in the first row, or null. */
export function litBulletAt(view: EditorView, event: MouseEvent): number | null {
	if (!view.state.field(editorLivePreviewField, false)) return null;
	if (view.state.field(zoomField, false) === undefined) return null;
	const position = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
	const lineIndex = view.state.doc.lineAt(position).number - 1;
	const marker = bulletMarker(outlineOfState(view.state), lineIndex);
	const row = firstRow(view, lineIndex);
	if (!marker || !row || event.clientY < row.top || event.clientY > row.bottom) return null;
	const span = markerSpan(view, lineIndex, marker.from, marker.to);
	if (!span) return null;
	const zone = litInterval(span, MINIMUM_HIT_WIDTH, GUTTER_WIDTH);
	return containsX(zone, event.clientX) ? lineIndex : null;
}

/** Lights up the bullet of an item, or puts the light out when there is none; does nothing when it is already shown. */
export function showLitBullet(view: EditorView, startLine: number | null): void {
	const current = view.state.field(bulletLightField, false);
	if (current === undefined || current === startLine) return;
	view.dispatch({ effects: setLitBullet.of(startLine) });
}
