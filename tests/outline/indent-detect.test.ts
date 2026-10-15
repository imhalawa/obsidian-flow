import { describe, expect, it } from 'vitest';
import { detectIndentStyle, styleFromUnit } from '../../src/outline/indent-detect';

describe('detectIndentStyle', () => {
	it.each([
		['tabs', ['- a', '\t- b'], { useTabs: true, unitColumns: 4, tabSize: 4 }],
		['two spaces', ['- a', '  - b', '    - c'], { useTabs: false, unitColumns: 2, tabSize: 4 }],
		['four spaces', ['- a', '    - b'], { useTabs: false, unitColumns: 4, tabSize: 4 }],
		[
			'the smallest step',
			['- a', '    - b', '      - c'],
			{ useTabs: false, unitColumns: 2, tabSize: 4 },
		],
		[
			'tabs even with spaces elsewhere',
			['- a', '  - b', '\t- c'],
			{ useTabs: true, unitColumns: 4, tabSize: 4 },
		],
	])('detects %s', (_name, lines, expected) => {
		expect(detectIndentStyle(lines, 4)).toEqual(expected);
	});

	it.each([
		['no list', ['text']],
		['a flat list', ['- a', '- b']],
		['nothing', []],
	])('finds no style in %s', (_name, lines) => {
		expect(detectIndentStyle(lines, 4)).toBeNull();
	});

	it('uses the given tab size for tabs', () => {
		expect(detectIndentStyle(['- a', '\t- b'], 2)).toEqual({
			useTabs: true,
			unitColumns: 2,
			tabSize: 2,
		});
	});
});

describe('styleFromUnit', () => {
	it.each([
		['\t', 4, { useTabs: true, unitColumns: 4, tabSize: 4 }],
		['\t', 2, { useTabs: true, unitColumns: 2, tabSize: 2 }],
		['  ', 4, { useTabs: false, unitColumns: 2, tabSize: 4 }],
		['    ', 4, { useTabs: false, unitColumns: 4, tabSize: 4 }],
		['', 4, { useTabs: false, unitColumns: 4, tabSize: 4 }],
	])('reads unit %j with tab size %i', (unit, tabSize, expected) => {
		expect(styleFromUnit(unit, tabSize)).toEqual(expected);
	});
});
