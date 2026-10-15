import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { zoomChange, zoomField, type ZoomNavigation } from '../../src/editor/zoom-field';
import { zoomHistoryField } from '../../src/editor/zoom-history-field';
import { currentEntry } from '../../src/outline/zoom-history';

const NOTE = ['- a', '  - b', '    - c', '- d'].join('\n');
const START_OF = { a: 0, b: 4, c: 10, d: 18 };

const create = () => EditorState.create({ doc: NOTE, extensions: [zoomField, zoomHistoryField] });

const go = (state: EditorState, startLine: number | null, navigation: ZoomNavigation) =>
	state.update({ effects: zoomChange.of({ startLine, navigation }) }).state;

describe('zoomHistoryField', () => {
	it('starts on the whole note', () => {
		const history = create().field(zoomHistoryField);
		expect(history.entries).toEqual([null]);
		expect(history.index).toBe(0);
	});

	it('records each zoom as a visit', () => {
		const state = go(go(create(), 0, 'visit'), 1, 'visit');
		const history = state.field(zoomHistoryField);
		expect(history.entries).toEqual([null, START_OF.a, START_OF.b]);
		expect(currentEntry(history)).toBe(START_OF.b);
	});

	it('records zooming out to the whole note', () => {
		const history = go(go(create(), 0, 'visit'), null, 'visit').field(zoomHistoryField);
		expect(history.entries).toEqual([null, START_OF.a, null]);
	});

	it('does not record the same zoom twice', () => {
		const history = go(go(create(), 0, 'visit'), 0, 'visit').field(zoomHistoryField);
		expect(history.entries).toEqual([null, START_OF.a]);
	});

	it('moves back and forward without recording', () => {
		const visited = go(go(create(), 0, 'visit'), 1, 'visit');
		const back = go(visited, 0, 'back').field(zoomHistoryField);
		expect(back.index).toBe(1);
		expect(back.entries).toHaveLength(3);
		const forward = go(go(visited, 0, 'back'), 1, 'forward').field(zoomHistoryField);
		expect(forward.index).toBe(2);
		expect(forward.entries).toEqual([null, START_OF.a, START_OF.b]);
	});

	it('drops forward entries on a new visit after going back', () => {
		const visited = go(go(create(), 0, 'visit'), 1, 'visit');
		const history = go(go(visited, 0, 'back'), 3, 'visit').field(zoomHistoryField);
		expect(history.entries).toEqual([null, START_OF.a, START_OF.d]);
	});

	it('keeps at most 50 entries', () => {
		let state = create();
		for (let step = 0; step < 120; step += 1) {
			state = go(state, step % 2 === 0 ? 0 : 3, 'visit');
		}
		expect(state.field(zoomHistoryField).entries).toHaveLength(50);
	});

	it('moves entries along with edits above them', () => {
		const visited = go(create(), 3, 'visit');
		const after = visited.update({ changes: { from: 0, insert: 'xx\n' } }).state;
		expect(after.field(zoomHistoryField).entries).toEqual([null, START_OF.d + 3]);
	});

	it('leaves the history alone when the document does not change', () => {
		const visited = go(create(), 3, 'visit');
		const after = visited.update({ selection: { anchor: 1 } }).state;
		expect(after.field(zoomHistoryField)).toBe(visited.field(zoomHistoryField));
	});
});
