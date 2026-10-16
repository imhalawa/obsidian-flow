import { describe, expect, it } from 'vitest';
import { enclosingHeadings, parseHeadings } from '../../src/outline/headings';

describe('parseHeadings', () => {
	it.each([
		['level one', ['# a'], [{ line: 0, level: 1, text: 'a' }]],
		['level six', ['###### a'], [{ line: 0, level: 6, text: 'a' }]],
		['an indent of three spaces', ['   # a'], [{ line: 0, level: 1, text: 'a' }]],
		['closing marks', ['## a ##'], [{ line: 0, level: 2, text: 'a' }]],
		['a tab after the marks', ['#\ta'], [{ line: 0, level: 1, text: 'a' }]],
		['a heading without text', ['#'], [{ line: 0, level: 1, text: '' }]],
	])('reads %s', (_name, lines, expected) => {
		expect(
			parseHeadings(lines).map(({ line, level, text }) => ({ line, level, text })),
		).toEqual(expected);
	});

	it.each([
		['no space after the marks', ['#a']],
		['seven marks', ['####### a']],
		['an indent of four spaces', ['    # a']],
		['a list item', ['- # a']],
		['a quote', ['> # a']],
		['plain text', ['a']],
		['an empty note', ['']],
	])('skips %s', (_name, lines) => {
		expect(parseHeadings(lines)).toEqual([]);
	});

	it.each([
		['backtick fence', ['```', '# a', '```', '# b']],
		['tilde fence', ['~~~', '# a', '~~~', '# b']],
		['a longer fence', ['````', '```', '# a', '````', '# b']],
		['an unclosed fence', ['# b', '```', '# a']],
	])('ignores headings inside a %s', (_name, lines) => {
		expect(parseHeadings(lines).map((heading) => heading.text)).toEqual(['b']);
	});

	it('skips front matter', () => {
		expect(parseHeadings(['---', '# a', '---', '# b']).map((heading) => heading.text)).toEqual([
			'b',
		]);
	});

	it('ends a section before the next heading of the same level', () => {
		const lines = ['# a', 'x', '# b', 'y'];
		expect(parseHeadings(lines).map((heading) => heading.endLine)).toEqual([1, 3]);
	});

	it('ends a section before the next heading of a higher level', () => {
		const lines = ['# a', '## b', 'x', '# c'];
		expect(parseHeadings(lines).map((heading) => heading.endLine)).toEqual([2, 2, 3]);
	});

	it('keeps lower level headings inside a section', () => {
		const lines = ['# a', '## b', '### c', 'x', '## d'];
		expect(parseHeadings(lines).map((heading) => heading.endLine)).toEqual([4, 3, 3, 4]);
	});

	it('ends the last section at the last line with content', () => {
		const lines = ['# a', 'x', '', ''];
		expect(parseHeadings(lines)[0]?.endLine).toBe(1);
	});

	it('leaves blank lines before the next heading out of a section', () => {
		const lines = ['# a', 'x', '', '# b'];
		expect(parseHeadings(lines)[0]?.endLine).toBe(1);
	});

	it('ends a heading with nothing under it on its own line', () => {
		const lines = ['# a', '', '# b'];
		expect(parseHeadings(lines)[0]?.endLine).toBe(0);
	});
});

describe('enclosingHeadings', () => {
	const headings = parseHeadings(['# a', '## b', '- x', '## c', '- y', '# d', '- z']);

	it.each([
		['a bullet under a nested heading', 2, ['a', 'b']],
		['a bullet under the next nested heading', 4, ['a', 'c']],
		['a bullet under a top heading', 6, ['d']],
	])('lists the headings above %s, outermost first', (_name, line, expected) => {
		expect(enclosingHeadings(headings, line).map((heading) => heading.text)).toEqual(expected);
	});

	it('lists the parent heading of a heading', () => {
		expect(enclosingHeadings(headings, 1).map((heading) => heading.text)).toEqual(['a']);
	});

	it('lists nothing for a top heading', () => {
		expect(enclosingHeadings(headings, 0)).toEqual([]);
	});

	it('lists nothing before the first heading', () => {
		expect(enclosingHeadings(parseHeadings(['x', '# a']), 0)).toEqual([]);
	});
});
