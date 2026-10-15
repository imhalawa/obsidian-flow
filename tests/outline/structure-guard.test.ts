import { describe, expect, it } from 'vitest';
import { depthsOf, guardedEdits } from '../../src/outline/structure-guard';
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

describe('guardedEdits', () => {
	const lines = ['- a', '- b'];

	it('accepts edits that produce the expected depths', () => {
		const edits = [{ lineIndex: 1, text: '  - b' }];
		expect(guardedEdits(lines, style, edits, [0, 1])).toEqual({ ok: true, edits });
	});

	it('refuses edits that produce other depths', () => {
		const edits = [{ lineIndex: 1, text: ' - b' }];
		expect(guardedEdits(lines, style, edits, [0, 1])).toEqual({
			ok: false,
			reason: 'structure-check-failed',
		});
	});

	it('refuses edits that change the number of items', () => {
		const edits = [{ lineIndex: 1, text: 'b' }];
		expect(guardedEdits(lines, style, edits, [0, 1])).toEqual({
			ok: false,
			reason: 'structure-check-failed',
		});
	});
});
