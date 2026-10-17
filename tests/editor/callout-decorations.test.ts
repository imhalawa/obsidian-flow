import { EditorSelection, EditorState } from '@codemirror/state';
import { WidgetType, type DecorationSet } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import {
	CALLOUT_AFTER_CLASS,
	CALLOUT_LINE_CLASS,
	calloutDecorations,
} from '../../src/editor/callout-decorations';

class TextWidget extends WidgetType {
	constructor(readonly markdown: string) {
		super();
	}
	toDOM(): HTMLElement {
		throw new Error('not drawn in tests');
	}
}

interface Found {
	from: number;
	to: number;
	kind: 'line' | 'replace';
	cls?: string;
	markdown?: string;
}

const found = (set: DecorationSet, length: number): Found[] => {
	const all: Found[] = [];
	set.between(0, length, (from, to, value) => {
		const spec = value.spec as { class?: string; widget?: TextWidget };
		all.push(
			spec.widget
				? { from, to, kind: 'replace', markdown: spec.widget.markdown }
				: { from, to, kind: 'line', cls: spec.class },
		);
	});
	return all;
};

const decorate = (doc: string, anchor: number, head: number) => {
	const state = EditorState.create({ doc, selection: EditorSelection.single(anchor, head) });
	return found(
		calloutDecorations(state, (markdown) => new TextWidget(markdown)),
		doc.length,
	);
};

const NOTE = ['- a', '\t- > [!tip] T', '\t  > body', '\t- next'].join('\n');

describe('calloutDecorations', () => {
	it('replaces the text of a callout bullet and marks its line and the line after it', () => {
		const second = NOTE.indexOf('\t- >');
		const bodyEnd = NOTE.indexOf('\n\t- next');
		expect(decorate(NOTE, 0, 0)).toEqual([
			{ from: second, to: second, kind: 'line', cls: CALLOUT_LINE_CLASS },
			{ from: second + 3, to: bodyEnd, kind: 'replace', markdown: '> [!tip] T\n> body' },
			{ from: bodyEnd + 1, to: bodyEnd + 1, kind: 'line', cls: CALLOUT_AFTER_CLASS },
		]);
	});

	it('shows the text while the cursor is on the first line of the callout', () => {
		expect(decorate(NOTE, NOTE.indexOf('tip'), NOTE.indexOf('tip'))).toEqual([]);
	});

	it('shows the text while the cursor is on a body line', () => {
		expect(decorate(NOTE, NOTE.indexOf('body'), NOTE.indexOf('body'))).toEqual([]);
	});

	it('shows the text while a selection reaches into the callout', () => {
		expect(decorate(NOTE, 0, NOTE.indexOf('body'))).toEqual([]);
	});

	it('shows the text while a selection covers the whole callout', () => {
		expect(decorate(NOTE, 0, NOTE.length)).toEqual([]);
	});

	it('replaces the callout again when the cursor is on the line after it', () => {
		expect(decorate(NOTE, NOTE.indexOf('next'), NOTE.indexOf('next'))).toHaveLength(3);
	});

	it('does not mark the line after a callout that is a quote', () => {
		const note = '- > [!tip] A\n- > [!note] B\n- c';
		const kinds = decorate(note, note.length, note.length).map((item) => item.cls ?? item.kind);
		expect(kinds).toEqual([
			CALLOUT_LINE_CLASS,
			'replace',
			CALLOUT_LINE_CLASS,
			'replace',
			CALLOUT_AFTER_CLASS,
		]);
	});

	it('does not mark a line after the last line of the note', () => {
		const items = decorate('- a\n- > [!tip] T', 0, 0);
		expect(items.map((item) => item.cls ?? item.kind)).toEqual([CALLOUT_LINE_CLASS, 'replace']);
	});

	it('replaces nothing in a note without callout bullets', () => {
		expect(decorate('- a\n- > quote\n> [!tip] plain callout', 0, 0)).toEqual([]);
	});

	it('draws every callout of the note', () => {
		const note = '- a\n- > [!tip] one\n- b\n- > [!note] two\n- c';
		const replaced = decorate(note, 0, 0).filter((item) => item.kind === 'replace');
		expect(replaced.map((item) => item.markdown)).toEqual(['> [!tip] one', '> [!note] two']);
	});

	it('keeps the text of the other callouts hidden while one is edited', () => {
		const note = '- > [!tip] one\n- > [!note] two';
		const replaced = decorate(note, 3, 3).filter((item) => item.kind === 'replace');
		expect(replaced.map((item) => item.markdown)).toEqual(['> [!note] two']);
	});

	it('finds the callouts again after the text changes', () => {
		const state = EditorState.create({ doc: '- a\n- b', selection: { anchor: 0 } });
		const changed = state.update({ changes: { from: 7, insert: '\n- > [!tip] t' } }).state;
		const items = found(
			calloutDecorations(changed, (markdown) => new TextWidget(markdown)),
			changed.doc.length,
		);
		expect(items.filter((item) => item.kind === 'replace')).toHaveLength(1);
	});
});
