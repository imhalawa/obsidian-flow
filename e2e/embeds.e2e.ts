import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

const PNG_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PDF =
	'%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';

beforeAll(async () => {
	app = await ObsidianApp.start();
	await app.evaluate(`(async () => {
		await app.vault.create('Release Notes.md', '# Release Notes\\n\\nline one\\n\\nline two ^blk\\n\\n## Sub\\n\\nsub text');
		await app.vault.createBinary('pic.png', Uint8Array.from(atob(${JSON.stringify(PNG_BASE64)}), (c) => c.charCodeAt(0)).buffer);
		await app.vault.createBinary('doc.pdf', new TextEncoder().encode(${JSON.stringify(PDF)}).buffer);
		await app.vault.createBinary('clip.mp3', new Uint8Array(100).buffer);
		await app.vault.createBinary('clip.mp4', new Uint8Array(100).buffer);
		await app.vault.create('board.canvas', '{"nodes":[],"edges":[]}');
		return true;
	})()`);
});

afterAll(async () => {
	await app.stop();
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const openWithEmbed = async (embed: string) => {
	const editor = await NoteEditor.open(app, `- a\n\t- ${embed}\n- z`);
	await editor.caret(2, 2);
	await wait(1200);
	return editor;
};

describe('embeds in bullets in real Obsidian', () => {
	it.each([
		['a note', '![[Release Notes]]'],
		['a heading of a note', '![[Release Notes#Sub]]'],
		['a block of a note', '![[Release Notes#^blk]]'],
		['an image', '![[pic.png]]'],
		['an image with a size', '![[pic.png|120]]'],
		['a markdown image', '![chart](pic.png)'],
		['a pdf', '![[doc.pdf]]'],
		['audio', '![[clip.mp3]]'],
		['video', '![[clip.mp4]]'],
		['a canvas', '![[board.canvas]]'],
	])('draws the bullet beside the top of %s', async (_name, embed) => {
		const editor = await openWithEmbed(embed);
		const layout = await editor.embedLayout(1);
		expect(layout?.marked).toBe(true);
		expect(layout!.embedTop - layout!.lineTop).toBeLessThan(2);
		expect(layout!.bulletTop - layout!.embedTop).toBeLessThan(4);
		expect(layout!.bulletRight).toBeLessThanOrEqual(layout!.embedLeft + 1);
	});

	it.each([
		['a note', '![[Release Notes]]'],
		['an image', '![[pic.png]]'],
		['a pdf', '![[doc.pdf]]'],
		['audio', '![[clip.mp3]]'],
	])('leaves no empty row below %s', async (_name, embed) => {
		const editor = await openWithEmbed(embed);
		const layout = await editor.embedLayout(1);
		expect(layout!.lineBottom - layout!.embedBottom).toBeLessThan(10);
	});

	it('keeps the embed inside the width of the note', async () => {
		const editor = await openWithEmbed('![[Release Notes]]');
		const layout = await editor.embedLayout(1);
		const content = await app.evaluate<number>(
			'activeDocument.querySelector(".workspace-leaf.mod-active .cm-content").getBoundingClientRect().right',
		);
		expect(layout!.embedRight).toBeLessThanOrEqual(content);
	});

	it('leaves an item with text around the embed as Obsidian draws it', async () => {
		const editor = await openWithEmbed('see ![[Release Notes]] now');
		const layout = await editor.embedLayout(1);
		expect(layout?.marked).toBe(false);
	});

	it('shows the source above the embed while the caret is in the item and beside the bullet again after', async () => {
		const editor = await openWithEmbed('![[Release Notes]]');
		await editor.focus();
		await editor.caret(1, 8);
		await wait(500);
		const editing = await editor.embedLayout(1);
		expect(editing!.embedTop - editing!.lineTop).toBeGreaterThan(20);
		await editor.caret(2, 2);
		await wait(1000);
		const resting = await editor.embedLayout(1);
		expect(resting!.embedTop - resting!.lineTop).toBeLessThan(2);
	});

	it('draws the embed again after the parent is folded and unfolded', async () => {
		const editor = await openWithEmbed('![[Release Notes]]');
		await editor.caret(0, 3);
		await editor.runCommand('fold-item');
		await wait(300);
		expect(await editor.visibleLines()).not.toContain('');
		await editor.runCommand('unfold-item');
		await editor.caret(2, 2);
		await wait(1000);
		const layout = await editor.embedLayout(1);
		expect(layout!.embedTop - layout!.lineTop).toBeLessThan(2);
	});

	it('moves a zoomed embed item to the left edge and keeps its bullet beside the embed', async () => {
		const editor = await NoteEditor.open(app, '- a\n\t- ![[Release Notes]]\n\t\t- child\n- z');
		await wait(1200);
		const topLevel = await editor.bulletPoint(0);
		await editor.caret(1, 5);
		await editor.runCommand('zoom-in');
		await editor.caret(2, 6);
		await wait(1200);
		const zoomed = await editor.bulletPoint(1);
		expect(Math.abs(zoomed.x - topLevel.x)).toBeLessThan(2);
		const layout = await editor.embedLayout(1);
		expect(layout!.embedTop - layout!.lineTop).toBeLessThan(2);
	});

	it('keeps the text of the note unchanged', async () => {
		const editor = await openWithEmbed('![[Release Notes]]');
		expect(await editor.text()).toBe('- a\n\t- ![[Release Notes]]\n- z');
	});

	it('logs no errors', async () => {
		await openWithEmbed('![[doc.pdf]]');
		expect(app.consoleErrors()).toEqual([]);
	});
});

describe('editing the markdown of an embed item in real Obsidian', () => {
	const SOURCE = '![[Release Notes]]';

	const clickCard = async () => {
		const editor = await openWithEmbed(SOURCE);
		const layout = await editor.embedLayout(1);
		await app.click(layout!.embedLeft + 60, layout!.embedTop + 60, false);
		await wait(500);
		return editor;
	};

	it('shows the markdown of the embed while its item is not edited', async () => {
		const editor = await openWithEmbed(SOURCE);
		expect((await editor.visibleLines()).some((line) => line.includes(SOURCE))).toBe(false);
	});

	it('reveals the markdown when the card is clicked', async () => {
		const editor = await clickCard();
		expect((await editor.visibleLines()).some((line) => line.includes(SOURCE))).toBe(true);
	});

	it('lets the user type after the embed once the card is clicked', async () => {
		const editor = await clickCard();
		await app.pressKey('end', false, false);
		await app.typeText(' note');
		expect(await editor.text()).toBe('- a\n\t- ![[Release Notes]] note\n- z');
	});

	it('reveals the markdown when the arrow keys move the caret into the item', async () => {
		const editor = await openWithEmbed(SOURCE);
		await editor.focus();
		await editor.caret(0, 3);
		await app.pressKey('down', false, false);
		await app.pressKey('down', false, false);
		await wait(500);
		expect((await editor.visibleLines()).some((line) => line.includes(SOURCE))).toBe(true);
	});
});

const DEEP = [
	'- l0',
	'\t- l1',
	'\t\t- ![[Release Notes]]',
	'\t\t\t- l3',
	'\t\t\t\t- ![[Release Notes#Sub]]',
	'\t\t\t\t\t- l5',
	'\t\t\t\t\t\t- ![[pic.png]]',
	'\t\t\t\t\t\t\t- ![[doc.pdf]]',
	'\t- sibling',
	'- z',
].join('\n');

const EMBED_LINES = [2, 4, 6, 7];

describe('embeds in nested bullets in real Obsidian', () => {
	const openDeep = async () => {
		const editor = await NoteEditor.open(app, DEEP);
		await editor.caret(9, 2);
		await wait(1800);
		return editor;
	};

	it.each(EMBED_LINES)('draws the embed of line %i beside its bullet', async (line) => {
		const editor = await openDeep();
		const layout = await editor.embedLayout(line);
		expect(layout!.embedTop - layout!.lineTop).toBeLessThan(2);
		expect(layout!.bulletRight).toBeLessThanOrEqual(layout!.embedLeft + 1);
		expect(layout!.lineBottom - layout!.embedBottom).toBeLessThan(10);
	});

	it('moves the embeds one level to the right for each level of nesting', async () => {
		const editor = await openDeep();
		const lefts = [];
		for (const line of EMBED_LINES) lefts.push((await editor.embedLayout(line))!.embedLeft);
		expect(lefts[1]! - lefts[0]!).toBeGreaterThan(20);
		expect(lefts[2]! - lefts[1]!).toBeGreaterThan(20);
		expect(lefts[3]! - lefts[2]!).toBeGreaterThan(20);
	});

	it('keeps every embed inside the width of the note', async () => {
		const editor = await openDeep();
		const content = await app.evaluate<number>(
			'activeDocument.querySelector(".workspace-leaf.mod-active .cm-content").getBoundingClientRect().right',
		);
		for (const line of EMBED_LINES) {
			expect((await editor.embedLayout(line))!.embedRight).toBeLessThanOrEqual(content);
		}
	});

	it('hides the children of an embed item when it is folded and shows them again when it is unfolded', async () => {
		const editor = await openDeep();
		await editor.caret(3, 4);
		await wait(300);
		await editor.runCommand('fold-item');
		await editor.caret(9, 2);
		await wait(500);
		expect(await editor.visibleLines()).not.toContain('l3');
		await editor.caret(2, 2);
		await editor.runCommand('unfold-item');
		await editor.caret(9, 2);
		await wait(800);
		expect(await editor.visibleLines()).toContain('l3');
		expect(
			(await editor.embedLayout(4))!.embedTop - (await editor.embedLayout(4))!.lineTop,
		).toBeLessThan(2);
	});

	it('moves a deep embed item to the left edge of the note when it is zoomed', async () => {
		const editor = await openDeep();
		const topLevel = await editor.bulletPoint(0);
		await editor.caret(4, 4);
		await editor.runCommand('zoom-in');
		await editor.caret(5, 8);
		await wait(1500);
		const zoomed = await editor.bulletPoint(4);
		expect(Math.abs(zoomed.x - topLevel.x)).toBeLessThan(2);
		const layout = await editor.embedLayout(6);
		expect(layout!.embedTop - layout!.lineTop).toBeLessThan(2);
	});

	it('keeps the embed beside its bullet after the item is indented and outdented', async () => {
		const editor = await openDeep();
		await editor.caret(8, 4);
		await editor.runCommand('indent-item');
		await editor.runCommand('outdent-item');
		await editor.caret(9, 2);
		await wait(1000);
		expect(await editor.text()).toBe(DEEP);
		expect(
			(await editor.embedLayout(7))!.embedTop - (await editor.embedLayout(7))!.lineTop,
		).toBeLessThan(2);
	});
});

describe('embed titles in bullets in real Obsidian', () => {
	const titleDisplay = () =>
		app.evaluate<string>(
			'getComputedStyle(activeDocument.querySelector(".workspace-leaf.mod-active .flow-embed-line .markdown-embed-title")).display',
		);

	const setHideTitles = async (hidden: boolean) => {
		await app.evaluate(
			`(app.plugins.plugins["flow-outliner"].settings.hideEmbedTitles = ${hidden}, app.workspace.updateOptions(), true)`,
		);
		await wait(500);
	};

	it('hides the title of a note embed by default', async () => {
		await openWithEmbed('![[Release Notes]]');
		expect(await titleDisplay()).toBe('none');
	});

	it('shows the title again when the setting is off', async () => {
		await openWithEmbed('![[Release Notes]]');
		await setHideTitles(false);
		expect(await titleDisplay()).not.toBe('none');
		await setHideTitles(true);
		expect(await titleDisplay()).toBe('none');
	});

	it('keeps the card clickable to its note while the title is hidden', async () => {
		await openWithEmbed('![[Release Notes]]');
		const links = await app.evaluate<number>(
			'activeDocument.querySelectorAll(".workspace-leaf.mod-active .flow-embed-line .markdown-embed-link").length',
		);
		expect(links).toBe(1);
	});

	it('lines the bullet up with the first line of the embed when the title is hidden', async () => {
		const editor = await openWithEmbed('![[Release Notes]]');
		const row = await app.evaluate<number>(
			'(() => { const content = activeDocument.querySelector(".workspace-leaf.mod-active .flow-embed-line .markdown-embed-content"); const box = content.getBoundingClientRect(); return box.top; })()',
		);
		const layout = await editor.embedLayout(1);
		expect(row - layout!.embedTop).toBeLessThan(6);
	});
});
