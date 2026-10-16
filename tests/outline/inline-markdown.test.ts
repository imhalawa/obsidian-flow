import { describe, expect, it } from 'vitest';
import { stripInlineMarkdown } from '../../src/outline/inline-markdown';

describe('stripInlineMarkdown', () => {
	it.each([
		["**Garden tasks for spring**", "Garden tasks for spring"],
		['__bold__', 'bold'],
		['*emphasis*', 'emphasis'],
		['_emphasis_', 'emphasis'],
		['a _b_ c', 'a b c'],
		['(_b_)', '(b)'],
		['x*y*z', 'xyz'],
		['a **b c** d', 'a b c d'],
		['~~struck~~', 'struck'],
		['==marked==', 'marked'],
		['`code`', 'code'],
		['***both***', 'both'],
		['**a** and **b**', 'a and b'],
		['before **bold** after', 'before bold after'],
	])('removes the markers of %j', (text, expected) => {
		expect(stripInlineMarkdown(text)).toBe(expected);
	});

	it.each([
		['[[Note]]', 'Note'],
		['[[Note|Alias]]', 'Alias'],
		['[[Note#Heading]]', 'Note#Heading'],
		['[text](https://example.com)', 'text'],
		['see [[Note]] and [a](b)', 'see Note and a'],
		['**[[Note]]**', 'Note'],
	])('shows the readable part of the link in %j', (text, expected) => {
		expect(stripInlineMarkdown(text)).toBe(expected);
	});

	it.each([
		['plain text'],
		[''],
		['snake_case_name'],
		['_a_b'],
		['2 * 3 * 4'],
		['**unclosed'],
		['a ~ b = c'],
		['a == b'],
		['lonely `tick'],
		['[not a link]'],
		['[[open'],
	])('leaves %j as it is', (text) => {
		expect(stripInlineMarkdown(text)).toBe(text);
	});
});
