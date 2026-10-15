import { describe, expect, it } from 'vitest';
import { indentDepth, parseListItem, visualWidth } from '../src/outline/list-item';

describe('parseListItem', () => {
	it.each([
		['- note', { indent: '', marker: '-', gap: ' ', checked: null, content: 'note' }],
		['\t* nested', { indent: '\t', marker: '*', gap: ' ', checked: null, content: 'nested' }],
		['  + plus', { indent: '  ', marker: '+', gap: ' ', checked: null, content: 'plus' }],
		['12. ordered', { indent: '', marker: '12.', gap: ' ', checked: null, content: 'ordered' }],
		['3) paren', { indent: '', marker: '3)', gap: ' ', checked: null, content: 'paren' }],
		['- [ ] todo', { indent: '', marker: '-', gap: ' ', checked: false, content: 'todo' }],
		['- [x] done', { indent: '', marker: '-', gap: ' ', checked: true, content: 'done' }],
		['-   spaced', { indent: '', marker: '-', gap: '   ', checked: null, content: 'spaced' }],
		[
			'- [ ]   spaced task',
			{ indent: '', marker: '-', gap: ' ', checked: false, content: 'spaced task' },
		],
		['-\ttabbed', { indent: '', marker: '-', gap: '\t', checked: null, content: 'tabbed' }],
		['- [x]', { indent: '', marker: '-', gap: ' ', checked: null, content: '[x]' }],
		['- [X] DONE', { indent: '', marker: '-', gap: ' ', checked: true, content: 'DONE' }],
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

describe('visualWidth', () => {
	it.each([
		['', 4, 0],
		['abc', 4, 3],
		['\t', 4, 4],
		['\t', 2, 2],
		[' \t', 4, 4],
		['  \t', 4, 4],
		['    \t', 4, 8],
		['-\t', 4, 4],
		['\t\t', 4, 8],
	])('measures %j with tab size %i as %i columns', (text, tabSize, expected) => {
		expect(visualWidth(text, tabSize)).toBe(expected);
	});
});
