import { describe, expect, it } from 'vitest';
import { applyEdits, refuse } from '../../src/outline/line-edit';

describe('applyEdits', () => {
	it('replaces the text of the edited lines only', () => {
		const lines = ['a', 'b', 'c'];
		expect(applyEdits(lines, [{ lineIndex: 1, text: 'B' }])).toEqual(['a', 'B', 'c']);
	});

	it('does not change the input', () => {
		const lines = ['a'];
		applyEdits(lines, [{ lineIndex: 0, text: 'z' }]);
		expect(lines).toEqual(['a']);
	});

	it('returns an equal copy for no edits', () => {
		expect(applyEdits(['a', 'b'], [])).toEqual(['a', 'b']);
	});
});

describe('refuse', () => {
	it('carries the reason', () => {
		expect(refuse('top-level')).toEqual({ ok: false, reason: 'top-level' });
	});
});
