import { describe, expect, it } from 'vitest';
import { depthsOf, guardedEdits, sameDepths } from '../../src/outline/structure-guard';
import { parseOutline } from '../../src/outline/outline-tree';
import type { IndentStyle } from '../../src/outline/indent-style';

const style: IndentStyle = { useTabs: false, unitColumns: 2, tabSize: 4 };

describe('depthsOf', () => {
	it('lists the depth of each item in document order', () => {
		const tree = parseOutline(['- a', '  - b', '    - c', '- d'], 4);
		expect(depthsOf(tree)).toEqual([0, 1, 2, 0]);
	});

	it('is empty for a note without items', () => {
		expect(depthsOf(parseOutline(['text'], 4))).toEqual([]);
	});
});

describe('sameDepths', () => {
	it.each<[string, number[], number[], boolean]>([
		['equal lists', [0, 1, 2], [0, 1, 2], true],
		['two empty lists', [], [], true],
		['lists of different length', [0, 1], [0, 1, 2], false],
		['a shorter second list', [0, 1, 2], [0, 1], false],
		['lists that differ in the last depth', [0, 1, 2], [0, 1, 1], false],
		['lists that differ in the first depth', [1, 1], [0, 1], false],
	])('compares %s', (_name, first, second, expected) => {
		expect(sameDepths(first, second)).toBe(expected);
	});
});

describe('guardedEdits', () => {
	const lines = ['- a', '- b'];

	it('accepts edits that produce the expected depths', () => {
		const edits = [{ lineIndex: 1, text: '  - b' }];
		expect(guardedEdits(lines, style, edits, [0, 1], [])).toEqual({
			ok: true,
			edits,
			lineMoves: [],
		});
	});

	it('passes the line moves through', () => {
		const moves = [{ fromLine: 0, toLine: 0, delta: 1 }];
		const result = guardedEdits(lines, style, [], [0, 0], moves);
		expect(result).toEqual({ ok: true, edits: [], lineMoves: moves });
	});

	it('refuses edits that produce other depths', () => {
		const edits = [{ lineIndex: 1, text: ' - b' }];
		expect(guardedEdits(lines, style, edits, [0, 1], [])).toEqual({
			ok: false,
			reason: 'structure-check-failed',
		});
	});

	it('refuses edits that change the number of items', () => {
		const edits = [{ lineIndex: 1, text: 'b' }];
		expect(guardedEdits(lines, style, edits, [0, 1], [])).toEqual({
			ok: false,
			reason: 'structure-check-failed',
		});
	});
});
