import { describe, expect, it } from 'vitest';
import { findCallouts, startsWithQuote } from '../../src/outline/callout';
import { parseOutline } from '../../src/outline/outline-tree';

const callouts = (lines: string[]) => calloutsAt(lines, 4);
const calloutsAt = (lines: string[], tabSize: number) =>
	findCallouts(lines, parseOutline(lines, tabSize), tabSize);

describe('findCallouts', () => {
	it('finds a one line callout bullet', () => {
		expect(callouts(['- > [!tip] Title'])).toEqual([
			{
				startLine: 0,
				endLine: 0,
				markerColumn: 2,
				hasChildren: false,
				markdown: '> [!tip] Title',
			},
		]);
	});

	it('finds a callout bullet without a title', () => {
		expect(callouts(['- > [!tip]'])[0]?.markdown).toBe('> [!tip]');
	});

	it.each([
		['a bullet with a star', '* > [!tip] t'],
		['a bullet with a plus', '+ > [!tip] t'],
		['a nested bullet', '\t- > [!tip] t'],
		['no space after the quote mark', '- >[!tip] t'],
		['a folded marker', '- > [!tip]- t'],
		['an open marker', '- > [!tip]+ t'],
		['an upper case type', '- > [!TIP] t'],
		['a custom type with a hyphen', '- > [!my-type] t'],
		['extra spaces after the quote mark', '- >   [!tip] t'],
	])('finds %s', (_name, line) => {
		expect(callouts(['- root', line])).toHaveLength(1);
	});

	it.each([
		['plain text', '- text'],
		['a plain quote', '- > quote'],
		['a nested quote', '- > > [!tip] t'],
		['an ordered item', '1. > [!tip] t'],
		['a task', '- [ ] > [!tip] t'],
		['a done task', '- [x] > [!tip] t'],
		['a missing bracket', '- > [!tip'],
		['an empty type', '- > [!] t'],
		['only a quote mark', '- >'],
		['a callout that is not a bullet', '> [!tip] t'],
		['indented code at the top level', '    - > [!tip] t'],
	])('ignores %s', (_name, line) => {
		expect(callouts([line])).toEqual([]);
	});

	it('ignores a callout bullet inside a fenced code block', () => {
		expect(callouts(['- a', '  ```', '  - > [!tip] t', '  ```'])).toEqual([]);
	});

	it('ignores a callout bullet inside front matter', () => {
		expect(callouts(['---', '- > [!tip] t', '---', '- a'])).toEqual([]);
	});

	it('joins the body lines that sit at the text column of the bullet', () => {
		expect(callouts(['- > [!tip] T', '  > one', '  > two', '- next'])).toEqual([
			{
				startLine: 0,
				endLine: 2,
				markerColumn: 2,
				hasChildren: false,
				markdown: '> [!tip] T\n> one\n> two',
			},
		]);
	});

	it('joins body lines indented with tabs', () => {
		expect(callouts(['- a', '\t- > [!tip] T', '\t  > one'])[0]).toMatchObject({
			startLine: 1,
			endLine: 2,
			markdown: '> [!tip] T\n> one',
		});
	});

	it('keeps list markers inside the body', () => {
		expect(callouts(['- > [!tip] T', '  > - a', '  > - b'])[0]?.markdown).toBe(
			'> [!tip] T\n> - a\n> - b',
		);
	});

	it('keeps an empty body line', () => {
		expect(callouts(['- > [!tip] T', '  > a', '  >', '  > b'])[0]?.markdown).toBe(
			'> [!tip] T\n> a\n>\n> b',
		);
	});

	it('stops the body at a blank line', () => {
		expect(callouts(['- > [!tip] T', '  > a', '', '  > b'])[0]).toMatchObject({ endLine: 1 });
	});

	it('stops the body at a line that is not a quote', () => {
		expect(callouts(['- > [!tip] T', '  > a', '  text'])[0]).toMatchObject({ endLine: 1 });
	});

	it('stops the body at a line that is not indented to the text column', () => {
		expect(callouts(['- > [!tip] T', ' > a'])[0]).toMatchObject({ endLine: 0 });
		expect(callouts(['- > [!tip] T', '> a'])[0]).toMatchObject({ endLine: 0 });
	});

	it('stops the body at a child item', () => {
		expect(callouts(['- > [!tip] T', '  > a', '  - child', '  > not body'])[0]).toMatchObject({
			endLine: 1,
		});
	});

	it('tells whether the callout bullet has children', () => {
		expect(
			callouts(['- > [!tip] T', '  > a', '	- child']).map((block) => block.hasChildren),
		).toEqual([true]);
		expect(
			callouts(['- > [!tip] T', '  > a', '- next']).map((block) => block.hasChildren),
		).toEqual([false]);
	});

	it('does not take the first line of the next callout bullet as body', () => {
		expect(callouts(['- > [!tip] A', '  > a', '- > [!note] B'])).toHaveLength(2);
	});

	it('finds every callout of a note in order', () => {
		const found = callouts([
			'- a',
			'\t- > [!tip] one',
			'\t- > [!warning] two',
			'- > [!note] three',
		]);
		expect(found.map((block) => block.startLine)).toEqual([1, 2, 3]);
	});

	it('finds nothing in an empty note', () => {
		expect(callouts([])).toEqual([]);
		expect(callouts([''])).toEqual([]);
	});

	it('uses the tab size to compare the indent of a body line', () => {
		expect(calloutsAt(['- r', '\t- > [!tip] T', '\t  > a'], 2)[0]).toMatchObject({
			endLine: 2,
		});
		expect(calloutsAt(['- r', '\t- > [!tip] T', '    > a'], 4)[0]).toMatchObject({
			endLine: 1,
		});
	});
});

describe('startsWithQuote', () => {
	it.each([
		['> a', true],
		['  > a', true],
		['- > a', true],
		['\t- > a', true],
		['* > a', true],
		['text', false],
		['- text', false],
		['', false],
		['1. > a', false],
	])('tells whether %j starts a quote', (line, expected) => {
		expect(startsWithQuote(line)).toBe(expected);
	});
});
