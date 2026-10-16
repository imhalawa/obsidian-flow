import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { clearReveal } from '../../src/editor/fold-reveal-field';
import { setThreadHover, threadHoverField } from '../../src/editor/thread-hover-field';

const create = () => EditorState.create({ doc: '- a\n  - b\n- c', extensions: [threadHoverField] });

const hovering = (startLine: number, x: number) =>
	create().update({ effects: setThreadHover.of({ startLine, x }) }).state;

describe('threadHoverField', () => {
	it('starts without a hovered thread line', () => {
		expect(create().field(threadHoverField)).toBeNull();
	});

	it('holds the thread line that was set', () => {
		expect(hovering(0, 40).field(threadHoverField)).toEqual({ startLine: 0, x: 40 });
	});

	it('replaces the hovered thread line with a newer one', () => {
		const state = hovering(0, 40).update({
			effects: setThreadHover.of({ startLine: 2, x: 12 }),
		}).state;
		expect(state.field(threadHoverField)).toEqual({ startLine: 2, x: 12 });
	});

	it('forgets the hovered thread line when it is cleared', () => {
		const state = hovering(0, 40).update({ effects: setThreadHover.of(null) }).state;
		expect(state.field(threadHoverField)).toBeNull();
	});

	it('keeps the hovered thread line through a selection change', () => {
		const state = hovering(0, 40).update({ selection: { anchor: 2 } }).state;
		expect(state.field(threadHoverField)).toEqual({ startLine: 0, x: 40 });
	});

	it('keeps the hovered thread line through an unrelated effect', () => {
		const state = hovering(0, 40).update({ effects: clearReveal.of(null) }).state;
		expect(state.field(threadHoverField)).toEqual({ startLine: 0, x: 40 });
	});

	it('forgets the hovered thread line when the text changes', () => {
		const state = hovering(0, 40).update({ changes: { from: 0, insert: 'x' } }).state;
		expect(state.field(threadHoverField)).toBeNull();
	});
});
