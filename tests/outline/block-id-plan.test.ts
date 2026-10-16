import { describe, expect, it } from 'vitest';
import { planBlockId, withBlockId } from '../../src/outline/block-id-plan';

const first = () => 0;
const zeros = '000000';

describe('planBlockId', () => {
	it('plans an id insertion for an item without one', () => {
		expect(planBlockId(['- a', '- b'], 4, 1, 'b', first)).toEqual({
			id: zeros,
			insertion: { lineIndex: 1, from: 3, to: 3, insert: ` ^${zeros}` },
		});
	});

	it('reuses the id an item already has without planning an insertion', () => {
		expect(planBlockId(['- a ^keep1', '- b'], 4, 0, 'a', first)).toEqual({
			id: 'keep1',
			insertion: null,
		});
	});

	it('avoids ids already used in the note', () => {
		const draws = [0, 0.5];
		const plan = planBlockId([`- a ^${zeros}`, '- b'], 4, 1, 'b', () => draws.shift() ?? 0.9);
		expect(plan?.id).toBe('i00000');
	});

	it.each([
		['a line that is not an item', ['text', '- a'], 0],
		['a continuation line of an item', ['- a', '  more'], 1],
		['a line past the end', ['- a'], 5],
	])('plans nothing for %s', (_name, lines, startLine) => {
		expect(planBlockId(lines, 4, startLine, 'a', first)).toBeNull();
	});

	it('plans nothing when the item on the line has other text', () => {
		expect(planBlockId(['- moved', '- a'], 4, 0, 'a', first)).toBeNull();
	});

	it('matches the text of an item without its block id', () => {
		expect(planBlockId(['- a ^keep1'], 4, 0, 'a', first)?.id).toBe('keep1');
	});
});

describe('withBlockId', () => {
	it('appends the id to the item', () => {
		expect(withBlockId('- a\n- b', 4, 0, 'a', first)).toEqual({
			text: `- a ^${zeros}\n- b`,
			id: zeros,
		});
	});

	it('keeps Windows line endings', () => {
		expect(withBlockId('- a\r\n- b\r\n', 4, 1, 'b', first)).toEqual({
			text: `- a\r\n- b ^${zeros}\r\n`,
			id: zeros,
		});
	});

	it('leaves the text alone when the item has an id', () => {
		expect(withBlockId('- a ^keep1', 4, 0, 'a', first)).toEqual({
			text: '- a ^keep1',
			id: 'keep1',
		});
	});

	it('returns null when no item starts on the line', () => {
		expect(withBlockId('text', 4, 0, 'text', first)).toBeNull();
	});

	it('returns null when the item on the line has other text', () => {
		expect(withBlockId('- other\n- b', 4, 0, 'a', first)).toBeNull();
	});
});
