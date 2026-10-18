import { EditorState } from '@codemirror/state';
import { showPanel } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { zoomExtension } from '../../src/editor/zoom-extension';
import { zoomChange } from '../../src/editor/zoom-field';
import { zoomPanel } from '../../src/editor/zoom-panel';

const NOTE = ['intro', '- a', '  - b'].join('\n');

const create = () =>
	EditorState.create({
		doc: NOTE,
		extensions: [
			zoomExtension(() => undefined),
			zoomPanel({ noteName: () => 'Plan', showHidden: () => undefined }),
		],
	});

const panelCount = (state: EditorState) =>
	state.facet(showPanel).filter((constructor) => constructor !== null).length;

describe('zoomPanel', () => {
	it('adds no panel while the whole note is shown', () => {
		expect(panelCount(create())).toBe(0);
	});

	it('adds one panel while zoomed into an item', () => {
		const zoomed = create().update({
			effects: zoomChange.of({ startLine: 1, navigation: 'visit' }),
		}).state;
		expect(panelCount(zoomed)).toBe(1);
	});

	it('removes the panel when the whole note is shown again', () => {
		const zoomed = create().update({
			effects: zoomChange.of({ startLine: 1, navigation: 'visit' }),
		}).state;
		const whole = zoomed.update({
			effects: zoomChange.of({ startLine: null, navigation: 'visit' }),
		}).state;
		expect(panelCount(whole)).toBe(0);
	});
});
