import { codeFolding, foldEffect, unfoldEffect } from '@codemirror/language';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { bulletCallouts } from '../../src/editor/callout-bullets';

class TextWidget extends WidgetType {
	toDOM(): HTMLElement {
		throw new Error('not drawn in tests');
	}
}

const NOTE = '- a\n- > [!tip] t';

const sets = (state: EditorState): DecorationSet[] =>
	state
		.facet(EditorView.decorations)
		.filter((source): source is DecorationSet => typeof source !== 'function');

const count = (state: EditorState): number => {
	let total = 0;
	for (const set of sets(state)) set.between(0, state.doc.length, () => void (total += 1));
	return total;
};

const create = (enabled: { on: boolean }, selection: number) =>
	EditorState.create({
		doc: NOTE,
		selection: EditorSelection.single(selection),
		extensions: [
			bulletCallouts(
				() => enabled.on,
				() => new TextWidget(),
				() => undefined,
			),
		],
	});

describe('bulletCallouts', () => {
	it('decorates a callout bullet while the setting is on', () => {
		expect(count(create({ on: true }, 0))).toBe(2);
	});

	it('decorates nothing while the setting is off', () => {
		expect(count(create({ on: false }, 0))).toBe(0);
	});

	it('shows the text again while the cursor is in the callout', () => {
		const state = create({ on: true }, 0);
		const moved = state.update({ selection: EditorSelection.single(NOTE.length) }).state;
		expect(count(moved)).toBe(0);
	});

	it('draws the callout again when the cursor leaves it', () => {
		const state = create({ on: true }, NOTE.length);
		const moved = state.update({ selection: EditorSelection.single(0) }).state;
		expect(count(moved)).toBe(2);
	});

	it('follows the setting when the editor refreshes', () => {
		const flag = { on: true };
		const state = create(flag, 0);
		flag.on = false;
		expect(count(state.update({}).state)).toBe(0);
		flag.on = true;
		expect(count(state.update({}).state)).toBe(2);
	});

	it('finds a callout typed into the note', () => {
		const flag = { on: true };
		const state = EditorState.create({
			doc: '- a',
			selection: EditorSelection.single(0),
			extensions: [
				bulletCallouts(
					() => flag.on,
					() => new TextWidget(),
					() => undefined,
				),
			],
		});
		const changed = state.update({ changes: { from: 3, insert: '\n- > [!tip] t' } }).state;
		expect(count(changed)).toBe(2);
	});

	it('drops the guide class of a callout bullet when it is folded', () => {
		const doc = '- > [!tip] t\n  - child\n- z';
		const state = EditorState.create({
			doc,
			selection: EditorSelection.single(doc.length),
			extensions: [
				codeFolding(),
				bulletCallouts(
					() => true,
					() => new TextWidget(),
					() => undefined,
				),
			],
		});
		const firstClass = (current: EditorState): string | undefined => {
			let found: string | undefined;
			for (const set of sets(current)) {
				set.between(0, current.doc.length, (_from, _to, value) => {
					found ??= (value.spec as { class?: string }).class;
				});
			}
			return found;
		};
		expect(firstClass(state)).toContain('flow-callout-parent');
		const folded = state.update({
			effects: foldEffect.of({ from: 12, to: doc.indexOf('\n- z') }),
		}).state;
		expect(firstClass(folded)).toBe('flow-callout-line');
		const unfolded = folded.update({
			effects: unfoldEffect.of({ from: 12, to: doc.indexOf('\n- z') }),
		}).state;
		expect(firstClass(unfolded)).toContain('flow-callout-parent');
	});
});
