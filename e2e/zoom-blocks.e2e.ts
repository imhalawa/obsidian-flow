import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
	await app.evaluate(
		`(async () => {
			const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
			await app.vault.createBinary('pic.png', png.buffer);
			await app.vault.create('embedded.md', '# Embedded\\n\\n- one\\n- two');
			return true;
		})()`,
	);
});

afterAll(async () => {
	await app.stop();
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const BLOCKS: [string, string[]][] = [
	['a callout', ['> [!tip] What to answer', '> - first', '> - second']],
	['a foldable callout', ['> [!tip]+ Open', '> - first']],
	['a custom icon callout', ['> [!fire] Hot', '> text']],
	['a table', ['| h1 | h2 |', '|----|----|', '| c | d |']],
	['a code block', ['```js', 'const x = 1;', '```']],
	['a math block', ['$$', 'x^2', '$$']],
	['a quote', ['> quoted', '> text']],
	['an image embed', ['![[pic.png]]']],
	['an image with a size', ['![[pic.png|200]]']],
	['a markdown image', ['![alt](pic.png)']],
	['an external image', ['![remote](https://example.invalid/x.png)']],
	['a note embed', ['![[embedded]]']],
	['a block embed', ['![[embedded#Embedded]]']],
	['a horizontal rule', ['***']],
	['a heading', ['# Heading', '', 'paragraph']],
	['an html block', ['<div>html</div>']],
	['a comment', ['%% hidden comment %%']],
	['a footnote', ['text[^1]', '', '[^1]: note']],
	['a mermaid diagram', ['```mermaid', 'graph TD', 'A-->B', '```']],
	['properties', ['---', 'title: x', 'tags: [a, b]', '---']],
	['a task list', ['- [ ] open task', '- [x] done task']],
	['an ordered list', ['1. one', '2. two']],
	['a nested quote', ['> outer', '> > inner']],
	['a nested callout', ['> [!info] Outer', '> > [!warning] Inner', '> > text']],
	['a multi line comment', ['%%', 'hidden', '%%']],
	['an html comment', ['<!-- note -->']],
	['an indented code block', ['    indented code']],
	['a setext heading', ['Title', '=====']],
	['a rule made of dashes', ['---']],
	['a rule made of underscores', ['___']],
	['a pdf embed', ['![[document.pdf]]']],
	['an audio embed', ['![[sound.mp3]]']],
	['a video embed', ['![[clip.mp4]]']],
	['a canvas embed', ['![[board.canvas]]']],
	['a base embed', ['![[view.base]]']],
	['an embed of a missing note', ['![[does not exist]]']],
	['an embed of a block id', ['![[embedded#^nothere]]']],
	[
		'a paragraph with inline math and links',
		['text $x^2$ and [[embedded]] and #tag and ==mark=='],
	],
	['a table with an image', ['| a | b |', '|---|---|', '| ![[pic.png]] | x |']],
	['a dataview style code block', ['```dataview', 'LIST', '```']],
	['a query block', ['```query', 'tag:#a', '```']],
	['a footnote definition', ['[^1]: a note']],
	['a line break', ['text<br>more']],
	['a long paragraph', ['word '.repeat(300).trim()]],
	['an iframe', ['<iframe src="about:blank"></iframe>']],
	['a list that is not part of the note list', ['* star item', '+ plus item']],
];

const LIST = [
	'- Experience',
	'\t- Projects',
	'\t\t- My project',
	'\t\t\t- What',
	'\t\t\t- Why',
	'\t\t- Other project',
	'\t\t\t- What',
	'- Tail',
];

const PLACES: [string, (block: string[]) => string[]][] = [
	['starting the note', (block) => [...block, '', ...LIST]],
	['right above the list', (block) => [...block, ...LIST]],
	['below the list', (block) => [...LIST, '', ...block]],
	['between the list and more of it', (block) => [...LIST, '', ...block, '', '- After']],
];

const visibleBlocks = () =>
	app.evaluate<string[]>(
		`Array.from(activeDocument.querySelectorAll('.workspace-leaf.mod-active .cm-content > *')).filter((el) => !el.classList.contains('cm-line') && el.getBoundingClientRect().height > 0).map((el) => el.className.slice(0, 60))`,
	);

describe('anything that is not part of a zoom stays hidden', () => {
	for (const [placeName, place] of PLACES) {
		describe(placeName, () => {
			it.each(BLOCKS)('%s', async (_name, block) => {
				const note = place(block).join('\n');
				const editor = await NoteEditor.open(app, note);
				await wait(700);
				await editor.caret(note.split('\n').indexOf('\t\t- My project'), 5);
				await editor.runCommand('zoom-in');
				await wait(900);
				expect(await editor.visibleLines()).toEqual([
					'\t\t- My project',
					'\t\t\t- What',
					'\t\t\t- Why',
				]);
				expect(await visibleBlocks()).toEqual([]);
			});
		});
	}
});

describe('blocks inside a zoom still render', () => {
	it.each([['an image embed', ['![[pic.png]]'], '.internal-embed img']])(
		'%s',
		async (_name, block, selector) => {
			const indented = block.map((line) => `\t\t\t${line}`);
			const note = [
				'- Experience',
				'\t- Projects',
				'\t\t- My project',
				...indented,
				'- Tail',
			].join('\n');
			const editor = await NoteEditor.open(app, note);
			await wait(700);
			await editor.caret(2, 5);
			await editor.runCommand('zoom-in');
			await wait(900);
			const shown = await app.evaluate<number>(
				`activeDocument.querySelectorAll('.workspace-leaf.mod-active .cm-content ${selector}').length`,
			);
			expect(shown).toBeGreaterThan(0);
		},
	);
});
