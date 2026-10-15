import { describe, expect, it } from 'vitest';
import { mapPosition } from '../../src/outline/position-map';

describe('mapPosition', () => {
	it('moves a cursor along with an indent', () => {
		const result = mapPosition(['- a', '- bc'], ['- a', '  - bc'], [[]], { line: 1, ch: 3 });
		expect(result).toEqual({ line: 1, ch: 5 });
	});

	it('moves a cursor at the line start to after the new indent', () => {
		const result = mapPosition(['- a', '- bc'], ['- a', '  - bc'], [[]], { line: 1, ch: 0 });
		expect(result).toEqual({ line: 1, ch: 2 });
	});

	it('moves a cursor back with an outdent', () => {
		const result = mapPosition(['- a', '  - bc'], ['- a', '- bc'], [[]], { line: 1, ch: 5 });
		expect(result).toEqual({ line: 1, ch: 3 });
	});

	it('leaves a cursor on an untouched line', () => {
		const result = mapPosition(['- a', '- bc'], ['- a', '  - bc'], [[]], { line: 0, ch: 2 });
		expect(result).toEqual({ line: 0, ch: 2 });
	});

	it('follows a moved line to its new place', () => {
		const before = ['- a', '- b'];
		const after = ['- b', '- a'];
		const steps = [
			[
				{ fromLine: 1, toLine: 1, delta: -1 },
				{ fromLine: 0, toLine: 0, delta: 1 },
			],
		];
		expect(mapPosition(before, after, steps, { line: 1, ch: 2 })).toEqual({ line: 0, ch: 2 });
	});

	it('keeps the column inside the text of a moved and indented line', () => {
		const before = ['- a', '- b'];
		const after = ['- a', '  - b'];
		expect(mapPosition(before, after, [[]], { line: 1, ch: 2 })).toEqual({ line: 1, ch: 4 });
	});
});
