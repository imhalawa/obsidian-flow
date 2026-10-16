import { codeFolding, foldEffect, unfoldEffect } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { clearReveal, revealField } from '../../src/editor/fold-reveal-field';

const NOTE = ['intro', '- a', '  - b', '    - c', '  - d', '- e', '  - f'].join('\n');
const lineStart = (line: number) =>
	line === 0 ? 0 : NOTE.split('\n').slice(0, line).join('\n').length + 1;
const lineEnd = (line: number) =>
	NOTE.split('\n')
		.slice(0, line + 1)
		.join('\n').length;

const create = () => EditorState.create({ doc: NOTE, extensions: [codeFolding(), revealField] });

const revealedStarts = (state: EditorState) => {
	const starts: number[] = [];
	state.field(revealField).between(0, state.doc.length, (from) => {
		starts.push(from);
	});
	return starts;
};

const revealedClasses = (state: EditorState) => {
	const classes: string[] = [];
	state.field(revealField).between(0, state.doc.length, (_from, _to, decoration) => {
		classes.push((decoration.spec as { class: string }).class);
	});
	return classes;
};

const unfolded = () =>
	create().update({ effects: unfoldEffect.of({ from: lineEnd(1), to: lineEnd(2) }) }).state;

describe('revealField', () => {
	it('starts without revealed lines', () => {
		expect(revealedStarts(create())).toEqual([]);
	});

	it('marks the lines that an unfold shows again', () => {
		const state = create().update({
			effects: unfoldEffect.of({ from: lineEnd(1), to: lineEnd(4) }),
		}).state;
		expect(revealedStarts(state)).toEqual([lineStart(2), lineStart(3), lineStart(4)]);
	});

	it('marks the lines of every range that is unfolded together', () => {
		const state = create().update({
			effects: [
				unfoldEffect.of({ from: lineEnd(1), to: lineEnd(2) }),
				unfoldEffect.of({ from: lineEnd(5), to: lineEnd(6) }),
			],
		}).state;
		expect(revealedStarts(state)).toEqual([lineStart(2), lineStart(6)]);
	});

	it('marks the lines of ranges that are unfolded later in the document first', () => {
		const state = create().update({
			effects: [
				unfoldEffect.of({ from: lineEnd(5), to: lineEnd(6) }),
				unfoldEffect.of({ from: lineEnd(1), to: lineEnd(2) }),
			],
		}).state;
		expect(revealedStarts(state)).toEqual([lineStart(2), lineStart(6)]);
	});

	it('marks nothing when a range is folded', () => {
		const state = create().update({
			effects: foldEffect.of({ from: lineEnd(1), to: lineEnd(4) }),
		}).state;
		expect(revealedStarts(state)).toEqual([]);
	});

	it('forgets the revealed lines when they are cleared', () => {
		const revealed = create().update({
			effects: unfoldEffect.of({ from: lineEnd(1), to: lineEnd(4) }),
		}).state;
		const cleared = revealed.update({ effects: clearReveal.of(null) }).state;
		expect(revealedStarts(cleared)).toEqual([]);
	});

	it('moves the revealed lines with an edit above them', () => {
		const revealed = create().update({
			effects: unfoldEffect.of({ from: lineEnd(1), to: lineEnd(2) }),
		}).state;
		const edited = revealed.update({ changes: { from: 0, insert: 'xx' } }).state;
		expect(revealedStarts(edited)).toEqual([lineStart(2) + 2]);
	});

	it('marks a revealed line with the class the stylesheet animates', () => {
		expect(revealedClasses(unfolded())).toEqual(['flow-line-revealed']);
	});

	it('hands the revealed lines to the editor to draw', () => {
		const state = unfolded();
		expect(state.facet(EditorView.decorations)).toContain(state.field(revealField));
	});
});
