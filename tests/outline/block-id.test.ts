import { describe, expect, it } from 'vitest';
import { stripBlockId } from '../../src/outline/block-id';

describe('stripBlockId', () => {
	it.each([
		['a trailing id', 'a ^abc123', 'a'],
		['text without an id', 'a', 'a'],
		['a caret inside the text', 'a ^b c', 'a ^b c'],
		['only an id', ' ^abc123', ''],
	])('handles %s', (_name, text, expected) => {
		expect(stripBlockId(text)).toBe(expected);
	});
});
