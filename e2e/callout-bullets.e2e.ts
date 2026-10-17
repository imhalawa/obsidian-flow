import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
});

afterAll(async () => {
	await app.stop();
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface CalloutLayout {
	lineTop: number;
	lineBottom: number;
	lineRight: number;
	widgetLeft: number;
	widgetTop: number;
	widgetBottom: number;
	widgetRight: number;
	bulletRight: number;
	bulletMiddle: number;
	titleMiddle: number;
}

const ACTIVE = '.workspace-leaf.mod-active';

const open = async (text: string, line: number, ch: number) => {
	const editor = await NoteEditor.open(app, text);
	await editor.caret(line, ch);
	await wait(1200);
	return editor;
};

const widgetCount = () =>
	app.evaluate<number>(
		`activeDocument.querySelectorAll('${ACTIVE} .flow-callout-widget').length`,
	);

const layout = (index: number) =>
	app.evaluate<CalloutLayout | null>(`(() => {
		const line = activeDocument.querySelectorAll('${ACTIVE} .flow-callout-line')[${index}];
		const widget = line?.querySelector('.flow-callout-widget');
		const bullet = line?.querySelector('.list-bullet');
		const title = line?.querySelector('.callout-title');
		if (!line || !widget || !bullet || !title) return null;
		const l = line.getBoundingClientRect();
		const w = widget.getBoundingClientRect();
		const b = bullet.getBoundingClientRect();
		const t = title.getBoundingClientRect();
		return { lineTop: l.top, lineBottom: l.bottom, lineRight: l.right, widgetLeft: w.left, widgetTop: w.top, widgetBottom: w.bottom, widgetRight: w.right, bulletRight: b.right, bulletMiddle: b.top + b.height / 2, titleMiddle: t.top + t.height / 2 };
	})()`);

const lineTexts = () =>
	app.evaluate<string[]>(
		`[...activeDocument.querySelectorAll('${ACTIVE} .cm-content > .cm-line')].map((line) => line.textContent ?? '')`,
	);

const NOTE = [
	'- Why',
	'\t- > [!tip] Business pain',
	'\t  > First line',
	'\t  > Second line',
	'\t- sibling',
].join('\n');

describe('callout bullets in real Obsidian', () => {
	it('draws a callout bullet with Obsidian callout markup', async () => {
		await open(NOTE, 4, 4);
		expect(
			await app.evaluate<string[]>(
				`[...activeDocument.querySelectorAll('${ACTIVE} .flow-callout-widget .callout')].map((callout) => callout.getAttribute('data-callout') + ':' + callout.querySelector('.callout-title-inner').textContent)`,
			),
		).toEqual(['tip:Business pain']);
	});

	it('draws the body lines inside the callout and takes them out of the note view', async () => {
		await open(NOTE, 4, 4);
		expect(
			await app.evaluate<string>(
				`activeDocument.querySelector('${ACTIVE} .flow-callout-widget .callout-content').textContent`,
			),
		).toContain('First line');
		expect(await lineTexts()).toEqual([
			'- Why',
			expect.stringContaining('Business pain'),
			'\t- sibling',
		]);
	});

	it('keeps the note text as it was', async () => {
		const editor = await open(NOTE, 4, 4);
		expect(await editor.text()).toBe(NOTE);
	});

	it('draws the bullet outside the callout, level with its title, on the same row', async () => {
		await open(NOTE, 4, 4);
		const box = (await layout(0))!;
		expect(box.bulletRight).toBeLessThanOrEqual(box.widgetLeft + 1);
		expect(box.widgetLeft - box.bulletRight).toBeLessThan(14);
		expect(Math.abs(box.bulletMiddle - box.titleMiddle)).toBeLessThanOrEqual(2);
		expect(box.widgetTop - box.lineTop).toBeLessThan(2);
		expect(box.lineBottom - box.widgetBottom).toBeLessThan(2);
	});

	it.each([1, 2, 3, 4, 5])(
		'keeps the bullet level with the title in note number %i opened in a row',
		async () => {
			await open(NOTE, 4, 4);
			const box = (await layout(0))!;
			expect(Math.abs(box.bulletMiddle - box.titleMiddle)).toBeLessThanOrEqual(2);
		},
	);

	it('keeps the callout inside the width of the note', async () => {
		await open(NOTE, 4, 4);
		const box = (await layout(0))!;
		expect(box.widgetRight).toBeLessThanOrEqual(box.lineRight + 1);
		expect(box.lineRight - box.widgetRight).toBeLessThan(6);
	});

	it('draws a callout of every nesting level', async () => {
		await open(
			'- a\n\t- b\n\t\t- > [!note] deep\n\t- > [!warning] mid\n- > [!tip] top\n- z',
			5,
			2,
		);
		expect(await widgetCount()).toBe(3);
		for (const index of [0, 1, 2]) {
			const box = (await layout(index))!;
			expect(box.widgetTop - box.lineTop).toBeLessThan(2);
			expect(box.lineBottom - box.widgetBottom).toBeLessThan(2);
		}
	});

	it('shows the text while the cursor is in the callout and draws it again when it leaves', async () => {
		const editor = await open(NOTE, 4, 4);
		expect(await widgetCount()).toBe(1);
		await editor.caret(1, 6);
		await wait(600);
		expect(await widgetCount()).toBe(0);
		expect(await lineTexts()).toContain('\t- > [!tip] Business pain');
		await editor.caret(4, 4);
		await wait(600);
		expect(await widgetCount()).toBe(1);
	});

	it('shows the text while the cursor is in a body line', async () => {
		await open(NOTE, 2, 8);
		expect(await widgetCount()).toBe(0);
	});

	it('moves the cursor into the callout when it is clicked', async () => {
		const editor = await open(NOTE, 4, 4);
		const point = await app.evaluate<{ x: number; y: number }>(
			`(() => { const box = activeDocument.querySelector('${ACTIVE} .callout-content').getBoundingClientRect(); return { x: box.left + 40, y: box.top + box.height / 2 }; })()`,
		);
		await app.click(point.x, point.y, false);
		await wait(600);
		expect((await editor.selections())[0]?.head.line).toBe(1);
		expect(await widgetCount()).toBe(0);
	});

	it('keeps the type of a custom callout', async () => {
		await open('- a\n- > [!my-type] custom\n- z', 2, 2);
		expect(
			await app.evaluate<string>(
				`activeDocument.querySelector('${ACTIVE} .flow-callout-widget .callout').getAttribute('data-callout')`,
			),
		).toBe('my-type');
	});

	it('renders markdown in the title', async () => {
		await open('- a\n- > [!tip] with **bold** and `code`\n- z', 2, 2);
		expect(
			await app.evaluate<string>(
				`activeDocument.querySelector('${ACTIVE} .flow-callout-widget .callout-title-inner').innerHTML`,
			),
		).toMatch(/<strong>bold<\/strong>.*<code>code<\/code>/);
	});

	it.each([
		['a plain quote', '- > quote'],
		['a quote inside a quote', '- > > [!tip] t'],
		['an ordered item', '1. > [!tip] t'],
		['a task', '- [ ] > [!tip] t'],
		['a missing bracket', '- > [!tip t'],
		['a callout that is not a bullet', '> [!tip] t'],
	])('leaves %s as Obsidian draws it', async (_name, line) => {
		await open(`- a\n${line}\n- z`, 3, 2);
		expect(await widgetCount()).toBe(0);
	});

	it('leaves a callout bullet inside a code block alone', async () => {
		await open('- a\n  ```\n  - > [!tip] t\n  ```\n- z', 4, 2);
		expect(await widgetCount()).toBe(0);
	});

	it('does not run markup that a title carries', async () => {
		await app.evaluate('(window.__pwn = undefined, true)');
		await open(
			'- a\n- > [!tip] <script>window.__pwn = 1</script><img src="x" onerror="window.__pwn = 2">\n- z',
			2,
			2,
		);
		expect(await app.evaluate<unknown>('window.__pwn')).toBeUndefined();
	});

	it('hides the quote bar Obsidian keeps for the lines the callout replaced', async () => {
		await open(NOTE, 0, 2);
		const display = await app.evaluate<string[]>(
			`[...activeDocument.querySelectorAll('${ACTIVE} .HyperMD-quote.flow-callout-line, ${ACTIVE} .HyperMD-quote.flow-callout-after')].map((line) => getComputedStyle(line, '::before').display)`,
		);
		expect(display.length).toBeGreaterThan(0);
		expect(display.every((value) => value === 'none')).toBe(true);
	});

	it('is drawn as plain text when the setting is switched off and as a callout when it is on again', async () => {
		const editor = await open(NOTE, 4, 4);
		await app.evaluate(
			`(app.plugins.plugins["flow-outliner"].settings.bulletCallouts = false, app.workspace.updateOptions(), true)`,
		);
		await wait(600);
		expect(await widgetCount()).toBe(0);
		expect(await editor.text()).toBe(NOTE);
		await app.evaluate(
			`(app.plugins.plugins["flow-outliner"].settings.bulletCallouts = true, app.workspace.updateOptions(), true)`,
		);
		await wait(800);
		expect(await widgetCount()).toBe(1);
	});

	it('adds a new bullet after the callout when Enter is pressed at the end of its title', async () => {
		const editor = await open('- a\n- > [!tip] t\n- z', 0, 0);
		await editor.caret(1, 12);
		await app.pressKey('enter', false, false);
		await wait(400);
		expect(await editor.text()).toBe('- a\n- > [!tip] t\n- \n- z');
	});

	it('keeps the callout when the parent bullet is folded and unfolded', async () => {
		const text = '- a\n\t- > [!tip] t\n\t  > body\n\t- b\n- z';
		const editor = await open(text, 4, 2);
		await editor.caret(0, 2);
		expect(await editor.runCommand('fold-item')).toBe(true);
		await wait(500);
		expect(await widgetCount()).toBe(0);
		await editor.runCommand('unfold-item');
		await editor.caret(4, 2);
		await wait(800);
		expect(await widgetCount()).toBe(1);
		expect(await editor.text()).toBe(text);
	});

	it('folds a callout bullet that has children and shows it again', async () => {
		const text = '- a\n- > [!tip] t\n  > body\n\t- child\n- z';
		const editor = await open(text, 4, 2);
		await editor.caret(1, 8);
		expect(await editor.runCommand('fold-item')).toBe(true);
		await editor.caret(4, 2);
		await wait(800);
		expect(await editor.text()).toBe(text);
		await editor.caret(1, 8);
		await editor.runCommand('unfold-item');
		await editor.caret(4, 2);
		await wait(800);
		expect(await widgetCount()).toBe(1);
	});

	it('draws a callout inside a zoomed item and after zooming out', async () => {
		const editor = await open('- a\n\t- > [!tip] t\n\t- b\n- z', 3, 2);
		await editor.caret(0, 2);
		await editor.runCommand('zoom-in');
		await editor.caret(2, 3);
		await wait(1000);
		expect(await widgetCount()).toBe(1);
		await editor.runCommand('zoom-out');
		await wait(800);
		expect(await widgetCount()).toBe(1);
	});

	it('zooms into a callout bullet and out again', async () => {
		const editor = await open('- a\n- > [!tip] t\n- z', 2, 2);
		await editor.caret(1, 6);
		expect(await editor.runCommand('zoom-in')).toBe(true);
		await editor.caret(1, 12);
		await editor.runCommand('zoom-out');
		await editor.caret(2, 2);
		await wait(800);
		expect(await widgetCount()).toBe(1);
	});

	it('folds and unfolds a collapsible callout when its chevron is clicked', async () => {
		const editor = await open('- a\n- > [!tip]- t\n  > body\n- z', 3, 2);
		const collapsed = () =>
			app.evaluate<boolean>(
				`activeDocument.querySelector('${ACTIVE} .flow-callout-widget .callout').classList.contains('is-collapsed')`,
			);
		expect(await collapsed()).toBe(true);
		const point = await app.evaluate<{ x: number; y: number }>(
			`(() => { const box = activeDocument.querySelector('${ACTIVE} .callout-fold').getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()`,
		);
		await app.click(point.x, point.y, false);
		await wait(500);
		expect(await collapsed()).toBe(false);
		expect(await widgetCount()).toBe(1);
		expect((await editor.selections())[0]?.head.line).toBe(3);
	});

	describe('children of a callout bullet', () => {
		const PARENT_NOTE = [
			'- a',
			'\t- > [!warning] Callout parent',
			'\t  > body',
			'\t\t- child one',
			'\t\t- child two',
			'\t- z',
		].join('\n');

		interface Guide {
			left: number;
			top: number;
			height: number;
			width: string;
			position: string;
			lineHeight: number;
			bulletCenter: number;
			bulletBottom: number;
		}

		const guide = () =>
			app.evaluate<Guide | null>(`(() => {
				const line = activeDocument.querySelector('${ACTIVE} .flow-callout-parent');
				const bullet = line?.querySelector('.list-bullet');
				if (!line || !bullet) return null;
				const style = getComputedStyle(line, '::after');
				const l = line.getBoundingClientRect();
				const b = bullet.getBoundingClientRect();
				return { left: parseFloat(style.left), top: parseFloat(style.top), height: parseFloat(style.height), width: style.borderLeftWidth, position: getComputedStyle(line).position, lineHeight: l.height, bulletCenter: (b.left + b.right) / 2 - l.left, bulletBottom: b.bottom - l.top };
			})()`);

		it('continues the indentation line of the children from the bullet of the callout', async () => {
			await open(PARENT_NOTE, 5, 2);
			const line = (await guide())!;
			expect(Math.abs(line.left - line.bulletCenter)).toBeLessThanOrEqual(1.5);
			expect(line.top).toBeGreaterThanOrEqual(line.bulletBottom);
			expect(line.top - line.bulletBottom).toBeLessThan(10);
			expect(Math.abs(line.top + line.height - line.lineHeight)).toBeLessThanOrEqual(1);
			expect(line.width).toBe('1px');
			expect(line.position).toBe('relative');
		});

		it('draws no line for a callout bullet without children', async () => {
			await open('- a\n\t- > [!warning] Callout\n\t  > body\n\t- z', 3, 2);
			expect(await guide()).toBeNull();
		});

		it('draws no line while the callout bullet is folded and draws it again when unfolded', async () => {
			const editor = await open(PARENT_NOTE, 5, 2);
			await editor.caret(1, 6);
			expect(await editor.runCommand('fold-item')).toBe(true);
			await editor.caret(5, 2);
			await wait(800);
			expect(await widgetCount()).toBe(1);
			expect(await guide()).toBeNull();
			await editor.caret(1, 6);
			await editor.runCommand('unfold-item');
			await editor.caret(5, 2);
			await wait(800);
			expect(await guide()).not.toBeNull();
			expect(await editor.text()).toBe(PARENT_NOTE);
		});

		it('keeps the line of a nested callout bullet under a callout bullet', async () => {
			await open(
				'- a\n\t- > [!warning] Outer\n\t\t- > [!tip] Inner\n\t\t\t- leaf\n\t- z',
				4,
				2,
			);
			expect(await widgetCount()).toBe(2);
			expect(
				await app.evaluate<number>(
					`activeDocument.querySelectorAll('${ACTIVE} .flow-callout-parent').length`,
				),
			).toBe(2);
		});
	});

	describe('in a narrow pane', () => {
		const NARROW_NOTE = [
			'- a',
			'\t- b',
			'\t\t- c',
			'\t\t\t- > [!warning] A callout with a title that is long enough to wrap',
			'\t\t\t\t- child',
			'\t\t- z',
		].join('\n');

		afterAll(async () => {
			await app.resizeWindow(1280, 900);
			await app.evaluate('(app.workspace.leftSplit.expand(), true)');
		});

		it('keeps the callout readable instead of squeezing it', async () => {
			const editor = await open(NARROW_NOTE, 5, 2);
			await app.evaluate('(app.workspace.leftSplit.collapse(), true)');
			await app.resizeWindow(300, 700);
			await editor.caret(5, 2);
			await wait(1500);
			const box = await app.evaluate<{
				width: number;
				minimum: number;
				shift: string;
				wrapped: boolean;
			}>(`(() => {
				const line = activeDocument.querySelector('${ACTIVE} .flow-callout-line');
				const widget = line.querySelector('.flow-callout-widget');
				const bullet = line.querySelector('.list-bullet').getBoundingClientRect();
				return { width: widget.getBoundingClientRect().width, minimum: parseFloat(getComputedStyle(widget).fontSize) * 10, shift: line.style.getPropertyValue('--flow-bullet-shift'), wrapped: widget.getBoundingClientRect().top >= bullet.bottom };
			})()`);
			expect(box.width).toBeGreaterThanOrEqual(box.minimum - 1);
			if (box.wrapped) expect(box.shift).toBe('0px');
			expect(await editor.text()).toBe(NARROW_NOTE);
		});
	});

	it('logs no error', async () => {
		expect(app.consoleErrors()).toEqual([]);
	});
});
