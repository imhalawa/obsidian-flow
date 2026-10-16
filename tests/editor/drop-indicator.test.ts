import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import {
	dropIndicator,
	indicatedDestination,
	setDropIndicator,
} from '../../src/editor/drop-indicator';

const DESTINATION = { kind: 'after', targetLine: 1 } as const;

describe('indicatedDestination', () => {
	it('is null when the plugin is not active in the editor', () => {
		expect(indicatedDestination(EditorState.create({ doc: '- a' }))).toBeNull();
	});

	it('is null when nothing is dragged', () => {
		const state = EditorState.create({ doc: '- a', extensions: [dropIndicator()] });
		expect(indicatedDestination(state)).toBeNull();
	});

	it('returns the destination that was set', () => {
		const state = EditorState.create({ doc: '- a', extensions: [dropIndicator()] }).update({
			effects: setDropIndicator.of(DESTINATION),
		}).state;
		expect(indicatedDestination(state)).toEqual(DESTINATION);
	});

	it('forgets the destination when the text changes', () => {
		const dragging = EditorState.create({ doc: '- a', extensions: [dropIndicator()] }).update({
			effects: setDropIndicator.of(DESTINATION),
		}).state;
		const edited = dragging.update({ changes: { from: 0, insert: 'x' } }).state;
		expect(indicatedDestination(edited)).toBeNull();
	});
});
