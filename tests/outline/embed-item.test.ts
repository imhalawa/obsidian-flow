import { describe, expect, it } from 'vitest';
import { isEmbedItem } from '../../src/outline/embed-item';

describe('isEmbedItem', () => {
	it.each([
		['a note embed', '- ![[Release Notes]]'],
		['a heading embed', '- ![[Release Notes#Sub]]'],
		['a block embed', '- ![[Release Notes#^blk]]'],
		['an image embed with a size', '- ![[pic.png|200]]'],
		['a pdf embed with a page', '- ![[doc.pdf#page=2]]'],
		['an audio embed', '- ![[clip.mp3]]'],
		['an embed with an alias', '- ![[Release Notes|Events]]'],
		['a markdown image', '- ![chart](assets/chart.png)'],
		['a markdown image without alt text', '- ![](assets/chart.png)'],
		['a nested item', '\t\t- ![[Release Notes]]'],
		['an item indented with spaces', '    * ![[Release Notes]]'],
		['an ordered item', '1. ![[Release Notes]]'],
		['an ordered item with a bracket', '12) ![[Release Notes]]'],
		['a plus item', '+ ![[Release Notes]]'],
		['an embed followed by spaces', '- ![[Release Notes]]   '],
		['an embed followed by a block id', '- ![[Release Notes]] ^abc-12'],
	])('accepts %s', (_name, line) => {
		expect(isEmbedItem(line)).toBe(true);
	});

	it.each([
		['text before the embed', '- see ![[Release Notes]]'],
		['text after the embed', '- ![[Release Notes]] and more'],
		['two embeds', '- ![[a]] ![[b]]'],
		['a link', '- [[Release Notes]]'],
		['a markdown link', '- [chart](assets/chart.png)'],
		['an empty item', '- '],
		['a plain paragraph', '![[Release Notes]]'],
		['an empty embed', '- ![[]]'],
		['an unclosed embed', '- ![[Release Notes'],
		['an empty line', ''],
		['a block id alone', '- ^abc'],
		['a task item', '- [ ] ![[Release Notes]]'],
	])('rejects %s', (_name, line) => {
		expect(isEmbedItem(line)).toBe(false);
	});
});
