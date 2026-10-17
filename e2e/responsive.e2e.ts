import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { ObsidianApp } from './support/obsidian-app';
import {
	DESKTOP_VIEWPORTS,
	PHONE_VIEWPORTS,
	TABLET_VIEWPORTS,
	type Viewport,
} from './support/viewports';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
	await app.evaluate('(app.workspace.leftSplit.collapse(), true)');
});

afterAll(async () => {
	await app.stop();
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LONG =
	'My project with a long description that keeps going so that it has to wrap on a narrow screen and still show its children';

const NOTE = [
	'- Experience',
	'\t- Projects',
	`\t\t- ${LONG}`,
	'\t\t\t- What',
	'\t\t\t- Why',
	'\t\t- Other project',
	'- Tail',
].join('\n');

const ZOOMED = [`\t\t- ${LONG}`, '\t\t\t- What', '\t\t\t- Why'];

interface Layout {
	width: number;
	height: number;
	overflowX: number;
	contentRight: number;
	bullets: { x: number; left: number; right: number }[];
	headerOverflow: number;
	headerRight: number;
	crumbsRight: number | null;
}

const layout = () =>
	app.evaluate<Layout>(
		`(() => {
			const cm = app.workspace.activeEditor.editor.cm;
			const scroller = cm.scrollDOM;
			const lines = Array.from(cm.dom.querySelectorAll('.cm-line')).filter((el) => el.getBoundingClientRect().height > 0);
			const bullets = lines.flatMap((line) => {
				const bullet = line.querySelector('.list-bullet');
				if (!bullet) return [];
				const box = bullet.getBoundingClientRect();
				return [{ x: (box.left + box.right) / 2, left: box.left, right: box.right }];
			});
			const header = activeDocument.querySelector('.workspace-leaf.mod-active .view-header');
			const crumbs = header.querySelector('.flow-crumbs');
			const content = cm.contentDOM.getBoundingClientRect();
			return {
				width: innerWidth,
				height: innerHeight,
				overflowX: scroller.scrollWidth - scroller.clientWidth,
				contentRight: content.right,
				bullets,
				headerOverflow: header.scrollWidth - header.clientWidth,
				headerRight: header.getBoundingClientRect().right,
				crumbsRight: crumbs ? crumbs.getBoundingClientRect().right : null,
			};
		})()`,
	);

let noteCounter = 0;

/** Resizes the window to a viewport and opens the note in it. */
async function openedAt(viewport: Viewport): Promise<NoteEditor> {
	await app.emulateScale(1);
	await app.resizeWindow(viewport.width, viewport.height);
	await wait(400);
	await app.emulateScale(viewport.scale);
	noteCounter += 1;
	const editor = await NoteEditor.openAt(app, `responsive ${noteCounter}.md`, NOTE);
	await wait(500);
	return editor;
}

/** Opens the note at a viewport and zooms into the long item. */
async function zoomedIn(viewport: Viewport): Promise<NoteEditor> {
	const editor = await openedAt(viewport);
	await editor.caret(2, 5);
	await editor.runCommand('zoom-in');
	await wait(600);
	return editor;
}

/** Checks the zoomed layout fits the window and the bullets stay in order. */
async function expectFits(editor: NoteEditor): Promise<void> {
	expect(await editor.visibleLines()).toEqual(ZOOMED);
	const metrics = await layout();
	expect(metrics.overflowX).toBeLessThanOrEqual(1);
	expect(metrics.headerOverflow).toBeLessThanOrEqual(1);
	expect(metrics.contentRight).toBeLessThanOrEqual(metrics.width + 1);
	if (metrics.crumbsRight !== null) {
		expect(metrics.crumbsRight).toBeLessThanOrEqual(metrics.headerRight + 1);
	}
	expect(metrics.bullets).toHaveLength(3);
	for (const bullet of metrics.bullets) {
		expect(bullet.left).toBeGreaterThanOrEqual(0);
		expect(bullet.right).toBeLessThanOrEqual(metrics.width);
	}
	const [root, firstChild, secondChild] = metrics.bullets;
	expect(firstChild?.x).toBeGreaterThan(root?.x ?? Infinity);
	expect(secondChild?.x).toBeCloseTo(firstChild?.x ?? -1, 0);
}

/** Scrolls the first child into view and returns the point of its bullet. */
async function childBullet(editor: NoteEditor): Promise<{ x: number; y: number }> {
	await app.evaluate(
		'(app.workspace.activeEditor.editor.scrollIntoView({ from: { line: 3, ch: 0 }, to: { line: 3, ch: 0 } }, true), true)',
	);
	await wait(300);
	return editor.bulletPoint(3);
}

/** Zooms into a child with its bullet and leaves it again. */
async function expectBulletZooms(editor: NoteEditor, touch: boolean): Promise<void> {
	const bullet = await childBullet(editor);
	if (touch) await app.tap(bullet.x, bullet.y);
	else await app.click(bullet.x, bullet.y, false);
	await wait(500);
	expect(await editor.visibleLines()).toEqual(['\t\t\t- What']);
	await editor.runCommand('zoom-out');
	await wait(400);
	expect(await editor.visibleLines()).toEqual(ZOOMED);
}

describe('desktop windows', () => {
	it.each(DESKTOP_VIEWPORTS)(
		'lays the zoom out in $name ($width x $height)',
		async (viewport) => {
			await expectFits(await zoomedIn(viewport));
		},
	);

	it.each(DESKTOP_VIEWPORTS)('zooms with the bullet in $name', async (viewport) => {
		await expectBulletZooms(await zoomedIn(viewport), false);
	});

	it.each(DESKTOP_VIEWPORTS)('keeps a menu inside the window in $name', async (viewport) => {
		const editor = await zoomedIn(viewport);
		const bullet = await childBullet(editor);
		await app.rightClick(bullet.x, bullet.y);
		await wait(300);
		const box = await app.evaluate<{
			left: number;
			top: number;
			right: number;
			bottom: number;
			width: number;
			height: number;
		} | null>(
			`(() => { const menu = activeDocument.querySelector('.menu'); if (!menu) return null; const b = menu.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: innerWidth, height: innerHeight }; })()`,
		);
		expect(box).not.toBeNull();
		expect(box?.left).toBeGreaterThanOrEqual(0);
		expect(box?.top).toBeGreaterThanOrEqual(0);
		expect(box?.right).toBeLessThanOrEqual(box?.width ?? 0);
		expect(box?.bottom).toBeLessThanOrEqual(box?.height ?? 0);
		await app.pressKey('escape', false, false);
	});

	it.each([DESKTOP_VIEWPORTS[0], DESKTOP_VIEWPORTS[7]] as Viewport[])(
		'folds and unfolds in $name',
		async (viewport) => {
			const editor = await openedAt(viewport);
			await editor.caret(1, 5);
			await editor.runCommand('fold-item');
			expect(await editor.folds()).toHaveLength(1);
			await editor.runCommand('unfold-item');
			expect(await editor.folds()).toEqual([]);
		},
	);

	it('keeps the zoom and the layout while the window is resized again and again', async () => {
		const editor = await zoomedIn(DESKTOP_VIEWPORTS[4] as Viewport);
		for (const [width, height] of [
			[400, 300],
			[2560, 1440],
			[700, 500],
			[3840, 2160],
			[1280, 720],
		] as const) {
			await app.resizeWindow(width, height);
			await wait(500);
			await expectFits(editor);
		}
	});

	it('keeps the zoom when the pixel density changes', async () => {
		const editor = await zoomedIn(DESKTOP_VIEWPORTS[4] as Viewport);
		for (const scale of [2, 1.25, 1, 3]) {
			await app.emulateScale(scale);
			await wait(400);
			await expectFits(editor);
		}
		await app.emulateScale(1);
	});
});

describe('tablets and phones', () => {
	beforeAll(async () => {
		await app.emulateScale(1);
		await app.emulateMobile(true);
	});

	afterAll(async () => {
		await app.emulateScale(1);
		await app.emulateMobile(false);
	});

	it.each([...TABLET_VIEWPORTS, ...PHONE_VIEWPORTS])(
		'lays the zoom out on $name ($width x $height)',
		async (viewport) => {
			await expectFits(await zoomedIn(viewport));
		},
	);

	it.each([...TABLET_VIEWPORTS, ...PHONE_VIEWPORTS])(
		'zooms with a tap on the bullet on $name',
		async (viewport) => {
			await expectBulletZooms(await zoomedIn(viewport), true);
		},
	);

	it('uses the phone layout on a narrow screen and the tablet layout on a wide one', async () => {
		await app.emulateScale(1);
		const classes = async (width: number) => {
			await app.resizeWindow(width, 900);
			await wait(500);
			return app.evaluate<string[]>(
				`Array.from(document.body.classList).filter((name) => ['is-phone', 'is-tablet'].includes(name))`,
			);
		};
		expect(await classes(430)).toEqual(['is-phone']);
		expect(await classes(900)).toEqual(['is-tablet']);
	});

	it('keeps the zoom when a device turns around', async () => {
		const editor = await zoomedIn(PHONE_VIEWPORTS[3] as Viewport);
		for (const [width, height] of [
			[844, 390],
			[390, 844],
			[844, 390],
		] as const) {
			await app.resizeWindow(width, height);
			await wait(500);
			await expectFits(editor);
		}
	});
});
