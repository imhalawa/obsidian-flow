import { StateEffect, StateField } from '@codemirror/state';

export interface ThreadHover {
	startLine: number;
	x: number;
}

export const setThreadHover = StateEffect.define<ThreadHover | null>();

export const threadHoverField = StateField.define<ThreadHover | null>({
	create: () => null,
	update(value, transaction) {
		if (transaction.docChanged) return null;
		let next = value;
		for (const effect of transaction.effects) {
			if (effect.is(setThreadHover)) next = effect.value;
		}
		return next;
	},
});
