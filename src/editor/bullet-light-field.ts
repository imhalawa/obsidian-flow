import { StateEffect, StateField, type EditorState, type Extension } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';

export const BULLET_LIT_CLASS = 'flow-bullet-lit';

export const setLitBullet = StateEffect.define<number | null>();

const litLine = Decoration.line({ class: BULLET_LIT_CLASS });

/** Holds the line index of the item whose bullet the pointer lights up. */
export const bulletLightField = StateField.define<number | null>({
	create: () => null,
	update(value, transaction) {
		if (transaction.docChanged) return null;
		let next = value;
		for (const effect of transaction.effects) {
			if (effect.is(setLitBullet)) next = effect.value;
		}
		return next;
	},
});

/** Returns the line decoration that marks the item whose bullet is lit. */
export function litBulletDecorations(state: EditorState): DecorationSet {
	const startLine = state.field(bulletLightField);
	if (startLine === null) return Decoration.none;
	return Decoration.set([litLine.range(state.doc.line(startLine + 1).from)]);
}

/** Returns the extension that lights up the bullet of the item the pointer is beside. */
export function bulletLight(): Extension {
	return [
		bulletLightField,
		EditorView.decorations.compute([bulletLightField], litBulletDecorations),
	];
}
