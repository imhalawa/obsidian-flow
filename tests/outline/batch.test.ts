import { describe, expect, it } from 'vitest';
import { runOnItems } from '../../src/outline/batch';
import type { IndentStyle } from '../../src/outline/indent-style';
import { indentItem, outdentItem } from '../../src/outline/indent';
import { moveItemDown, moveItemUp } from '../../src/outline/move';

const style: IndentStyle = { useTabs: false, unitColumns: 2, tabSize: 4 };

describe('runOnItems', () => {
	it('indents siblings one after another', () => {
		const result = runOnItems(['- p', '- a', '- b'], style, [1, 2], indentItem);
		expect(result).toEqual(
			expect.objectContaining({ ok: true, lines: ['- p', '  - a', '  - b'] }),
		);
	});

	it('outdents nested siblings one after another', () => {
		const result = runOnItems(['- p', '  - a', '  - b'], style, [1, 2], outdentItem);
		expect(result).toEqual(expect.objectContaining({ ok: true, lines: ['- p', '- a', '- b'] }));
	});

	it('moves several siblings up together', () => {
		const result = runOnItems(['- p', '- a', '- b'], style, [1, 2], moveItemUp);
		expect(result).toEqual(expect.objectContaining({ ok: true, lines: ['- a', '- b', '- p'] }));
	});

	it('moves several siblings down together when given bottom first', () => {
		const result = runOnItems(['- a', '- b', '- p'], style, [1, 0], moveItemDown);
		expect(result).toEqual(expect.objectContaining({ ok: true, lines: ['- p', '- a', '- b'] }));
	});

	it('follows an item that an earlier move displaced', () => {
		const result = runOnItems(['- p', '- a', '- b'], style, [1, 2], moveItemUp);
		expect(result.ok && result.steps.length).toBe(2);
	});

	it('refuses everything when one item cannot move', () => {
		expect(runOnItems(['- a', '- b'], style, [0, 1], moveItemUp)).toEqual({
			ok: false,
			reason: 'no-previous-sibling',
		});
	});

	it('refuses when there is nothing to act on', () => {
		expect(runOnItems(['- a'], style, [], indentItem)).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});

	it('does not change the input lines', () => {
		const lines = ['- a', '- b'];
		runOnItems(lines, style, [1], indentItem);
		expect(lines).toEqual(['- a', '- b']);
	});
});
