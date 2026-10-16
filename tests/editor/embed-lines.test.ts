import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import {
	EMBED_LINE_CLASS,
	EMBED_UNTITLED_CLASS,
	embedLineDecorations,
} from '../../src/editor/embed-lines';

const markedLines = (doc: string, hideTitles: boolean) => {
	const state = EditorState.create({ doc });
	const found: { line: number; className: string }[] = [];
	embedLineDecorations(state, hideTitles).between(
		0,
		state.doc.length,
		(from, _to, decoration) => {
			found.push({
				line: state.doc.lineAt(from).number - 1,
				className: (decoration.spec as { class: string }).class,
			});
		},
	);
	return found;
};

describe('embedLineDecorations', () => {
	it('marks every item that holds only an embed', () => {
		const doc = ['- a', '\t- ![[Release Notes]]', '\t- ![[pic.png]]', '- ![](chart.png)'].join(
			'\n',
		);
		expect(markedLines(doc, false)).toEqual([
			{ line: 1, className: EMBED_LINE_CLASS },
			{ line: 2, className: EMBED_LINE_CLASS },
			{ line: 3, className: EMBED_LINE_CLASS },
		]);
	});

	it('marks the lines to hide the embed title when asked to', () => {
		expect(markedLines('- a\n- ![[Release Notes]]', true)).toEqual([
			{ line: 1, className: `${EMBED_LINE_CLASS} ${EMBED_UNTITLED_CLASS}` },
		]);
	});

	it.each([
		['an item with text around the embed', '- see ![[Release Notes]] now'],
		['a paragraph that is an embed', '![[Release Notes]]'],
		['a document without embeds', '- a\n- b'],
		['an empty document', ''],
	])('marks nothing for %s', (_name, doc) => {
		expect(markedLines(doc, false)).toEqual([]);
	});
});
