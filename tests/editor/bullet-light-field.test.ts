import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { clearReveal } from '../../src/editor/fold-reveal-field';
import {
	BULLET_LIT_CLASS,
	bulletLightField,
	litBulletDecorations,
	setLitBullet,
} from '../../src/editor/bullet-light-field';

const create = () => EditorState.create({ doc: '- a\n  - b\n- c', extensions: [bulletLightField] });

const lighting = (startLine: number) =>
	create().update({ effects: setLitBullet.of(startLine) }).state;

const litLines = (state: EditorState) => {
	const found: { line: number; className: string }[] = [];
	litBulletDecorations(state).between(0, state.doc.length, (from, _to, decoration) => {
		found.push({
			line: state.doc.lineAt(from).number - 1,
			className: (decoration.spec as { class: string }).class,
		});
	});
	return found;
};

describe('bulletLightField', () => {
	it('starts with no lit bullet', () => {
		expect(create().field(bulletLightField)).toBeNull();
	});

	it('holds the line of the bullet that was lit', () => {
		expect(lighting(1).field(bulletLightField)).toBe(1);
	});

	it('replaces the lit bullet with a newer one', () => {
		const state = lighting(1).update({ effects: setLitBullet.of(2) }).state;
		expect(state.field(bulletLightField)).toBe(2);
	});

	it('forgets the lit bullet when it is put out', () => {
		const state = lighting(1).update({ effects: setLitBullet.of(null) }).state;
		expect(state.field(bulletLightField)).toBeNull();
	});

	it('keeps the lit bullet through a selection change', () => {
		const state = lighting(1).update({ selection: { anchor: 2 } }).state;
		expect(state.field(bulletLightField)).toBe(1);
	});

	it('keeps the lit bullet through an unrelated effect', () => {
		const state = lighting(1).update({ effects: clearReveal.of(null) }).state;
		expect(state.field(bulletLightField)).toBe(1);
	});

	it('forgets the lit bullet when the text changes', () => {
		const state = lighting(1).update({ changes: { from: 0, insert: 'x' } }).state;
		expect(state.field(bulletLightField)).toBeNull();
	});
});

describe('litBulletDecorations', () => {
	it('marks the line of the lit bullet', () => {
		expect(litLines(lighting(1))).toEqual([{ line: 1, className: BULLET_LIT_CLASS }]);
	});

	it('marks nothing while no bullet is lit', () => {
		expect(litLines(create())).toEqual([]);
	});
});
