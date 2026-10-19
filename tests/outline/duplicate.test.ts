import { describe, expect, it } from 'vitest';
import { duplicateSubtree } from '../../src/outline/duplicate';
import type { IndentStyle } from '../../src/outline/indent-style';

const spaces: IndentStyle = { useTabs: false, unitColumns: 2, tabSize: 4 };

describe('duplicateSubtree', () => {
	it.each([
		['a leaf', ['- a', '- b'], 0, ['- a', '- a', '- b'], 1, 1],
		[
			'an item with children',
			['- a', '  - b', '- c'],
			0,
			['- a', '  - b', '- a', '  - b', '- c'],
			2,
			2,
		],
		['a nested item', ['- a', '  - b', '  - c'], 1, ['- a', '  - b', '  - b', '  - c'], 2, 1],
		['the last item', ['- a'], 0, ['- a', '- a'], 1, 1],
		['an item before a blank line', ['- a', '', '- b'], 0, ['- a', '- a', '', '- b'], 1, 1],
		['a task', ['- [x] a'], 0, ['- [x] a', '- [x] a'], 1, 1],
		['an ordered item', ['1. a', '2. b'], 0, ['1. a', '1. a', '2. b'], 1, 1],
	])('copies %s below itself', (_name, lines, source, expected, blockStart, blockLength) => {
		const result = duplicateSubtree(lines, spaces, source);
		expect(result).toEqual({ ok: true, lines: expected, blockStart, blockLength });
	});

	it('drops block ids from the copy', () => {
		const result = duplicateSubtree(['- a ^abc', '  - b ^def'], spaces, 0);
		expect(result).toEqual({
			ok: true,
			lines: ['- a ^abc', '  - b ^def', '- a', '  - b'],
			blockStart: 2,
			blockLength: 2,
		});
	});

	it('refuses a line that is not an item', () => {
		expect(duplicateSubtree(['text', '- a'], spaces, 0)).toEqual({
			ok: false,
			reason: 'not-a-list-item',
		});
	});
});
