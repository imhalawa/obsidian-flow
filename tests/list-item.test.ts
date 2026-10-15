import { describe, expect, it } from 'vitest';
import { indentDepth, parseListItem } from '../src/outline/list-item';

describe('parseListItem', () => {
	it.each([
		['- note', { indent: '', marker: '-', checked: null, content: 'note' }],
		['\t* nested', { indent: '\t', marker: '*', checked: null, content: 'nested' }],
		['  + plus', { indent: '  ', marker: '+', checked: null, content: 'plus' }],
		['12. ordered', { indent: '', marker: '12.', checked: null, content: 'ordered' }],
		['3) paren', { indent: '', marker: '3)', checked: null, content: 'paren' }],
		['- [ ] todo', { indent: '', marker: '-', checked: false, content: 'todo' }],
		['- [x] done', { indent: '', marker: '-', checked: true, content: 'done' }],
		['-   spaced', { indent: '', marker: '-', checked: null, content: 'spaced' }],
		[
			'- [ ]   spaced task',
			{ indent: '', marker: '-', checked: false, content: 'spaced task' },
		],
		['- [x]', { indent: '', marker: '-', checked: null, content: '[x]' }],
		['- [X] DONE', { indent: '', marker: '-', checked: true, content: 'DONE' }],
	])('parses %j', (line, expected) => {
		expect(parseListItem(line)).toEqual(expected);
	});

	it.each(['', 'plain text', '-no space', '1.no space', '# heading', '--- rule', '- a\nb'])(
		'rejects %j',
		(line) => {
			expect(parseListItem(line)).toBeNull();
		},
	);
});

describe('indentDepth', () => {
	it('counts tabs and tab-size spaces as one level', () => {
		expect(indentDepth('', 4)).toBe(0);
		expect(indentDepth('\t', 4)).toBe(1);
		expect(indentDepth('\t\t', 4)).toBe(2);
		expect(indentDepth('    ', 4)).toBe(1);
		expect(indentDepth('  ', 2)).toBe(1);
	});

	it('rounds partial indents down', () => {
		expect(indentDepth('   ', 4)).toBe(0);
		expect(indentDepth(' \t', 4)).toBe(1);
	});
});
