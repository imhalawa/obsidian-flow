import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NoteEditor } from './support/note-editor';
import { NotePane, type Point } from './support/note-pane';
import { ObsidianApp } from './support/obsidian-app';

let app: ObsidianApp;

beforeAll(async () => {
	app = await ObsidianApp.start();
});

afterAll(async () => {
	await app.stop();
});

const NOTE = '- a\n\t- b\n\t\t- c\n- d\n- e';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Opens a note and returns its pane. */
async function open(text: string): Promise<NotePane> {
	const editor = await NoteEditor.open(app, text);
	await wait(200);
	return NotePane.of(app, await editor.path());
}

/** Returns the horizontal distance of one level of nesting on screen. */
async function levelWidth(pane: NotePane): Promise<number> {
	return (await pane.bulletPoint(1)).x - (await pane.bulletPoint(0)).x;
}

/** Drags the bullet of an item to the top or bottom half of another line; levels place the pointer over the bullet of the target moved sideways by that many levels, and null keeps it in the left margin. */
async function dragTo(
	pane: NotePane,
	line: number,
	targetLine: number,
	half: 'top' | 'bottom',
	levels: number | null,
): Promise<void> {
	const grip = await pane.bulletPoint(line);
	const box = await pane.lineBox(targetLine);
	const height = box.bottom - box.top;
	const x =
		levels === null
			? (await pane.bulletPoint(0)).x - (await levelWidth(pane))
			: (await pane.bulletPoint(targetLine)).x + levels * (await levelWidth(pane));
	const destination = {
		x,
		y: half === 'top' ? box.top + height * 0.2 : box.bottom - height * 0.2,
	};
	const steps = [0.25, 0.5, 0.75, 1].map((fraction) => ({
		x: grip.x + (destination.x - grip.x) * fraction,
		y: grip.y + (destination.y - grip.y) * fraction,
	}));
	await app.drag([grip, ...steps]);
	await wait(150);
}

/** Presses the bullet of an item and moves over the top or bottom half of a line without letting go. */
async function holdOver(
	pane: NotePane,
	line: number,
	targetLine: number,
	half: 'top' | 'bottom',
): Promise<Point> {
	const grip = await pane.bulletPoint(line);
	const box = await pane.lineBox(targetLine);
	const height = box.bottom - box.top;
	const destination = {
		x: grip.x,
		y: half === 'top' ? box.top + height * 0.2 : box.bottom - height * 0.2,
	};
	await app.holdButton('press', grip.x, grip.y);
	await app.holdButton('move', grip.x, (grip.y + destination.y) / 2);
	await app.holdButton('move', destination.x, destination.y);
	await wait(150);
	return destination;
}

describe('drag and drop in real Obsidian', () => {
	it('draws no handle in the gutter', async () => {
		const pane = await open(NOTE);
		expect(await pane.handleCount()).toBe(0);
	});

	it('zooms into an item when its bullet is pressed and released without moving', async () => {
		const pane = await open(NOTE);
		const bullet = await pane.bulletPoint(0);
		await app.drag([bullet, bullet]);
		await wait(200);
		expect(await pane.text()).toBe(NOTE);
		expect(await NoteEditor.attach(app).crumbs()).toEqual(['a']);
	});

	it('zooms when the pointer moves less than the drag distance', async () => {
		const pane = await open(NOTE);
		const bullet = await pane.bulletPoint(0);
		await app.drag([bullet, { x: bullet.x + 2, y: bullet.y + 1 }]);
		await wait(200);
		expect(await NoteEditor.attach(app).crumbs()).toEqual(['a']);
	});

	it('does not zoom when the bullet is dragged', async () => {
		const pane = await open(NOTE);
		await dragTo(pane, 3, 0, 'top', null);
		expect(await NoteEditor.attach(app).crumbs()).toEqual([]);
	});

	it('moves an item above another one', async () => {
		const pane = await open(NOTE);
		await dragTo(pane, 3, 0, 'top', null);
		expect(await pane.text()).toBe('- d\n- a\n\t- b\n\t\t- c\n- e');
	});

	it('moves an item with its children below another one', async () => {
		const pane = await open(NOTE);
		await dragTo(pane, 0, 4, 'bottom', null);
		expect(await pane.text()).toBe('- d\n- e\n- a\n\t- b\n\t\t- c');
	});

	it('moves an item in as the first child of an item that shows its children', async () => {
		const pane = await open(NOTE);
		await dragTo(pane, 3, 0, 'bottom', null);
		expect(await pane.text()).toBe('- a\n\t- d\n\t- b\n\t\t- c\n- e');
	});

	it('moves a deep item out to the top level', async () => {
		const pane = await open(NOTE);
		await dragTo(pane, 2, 3, 'bottom', null);
		expect(await pane.text()).toBe('- a\n\t- b\n- d\n- c\n- e');
	});

	it('nests an item one level deeper when the pointer moves right', async () => {
		const pane = await open(NOTE);
		await dragTo(pane, 4, 3, 'bottom', 1);
		expect(await pane.text()).toBe('- a\n\t- b\n\t\t- c\n- d\n\t- e');
	});

	it('moves an item out one level when the pointer moves left', async () => {
		const pane = await open('- a\n\t- b\n\t\t- c\n- d');
		await dragTo(pane, 3, 2, 'bottom', -1);
		expect(await pane.text()).toBe('- a\n\t- b\n\t\t- c\n\t- d');
	});

	it('shows the drop indicator only while dragging', async () => {
		const pane = await open(NOTE);
		await dragTo(pane, 3, 4, 'bottom', null);
		expect(await pane.indicatorCount()).toBe(0);
	});

	it('moves an item in one undo step', async () => {
		const pane = await open(NOTE);
		await dragTo(pane, 3, 0, 'top', null);
		await pane.undo();
		expect(await pane.text()).toBe(NOTE);
	});

	it('leaves the note alone when an item is dropped on its own children', async () => {
		const pane = await open(NOTE);
		await dragTo(pane, 0, 2, 'bottom', null);
		expect(await pane.text()).toBe(NOTE);
	});

	it('does not drag when the setting is off', async () => {
		await app.evaluate(
			'(app.plugins.plugins["flow-outliner"].settings.dragItems = false, app.workspace.updateOptions(), true)',
		);
		const pane = await open(NOTE);
		await dragTo(pane, 3, 0, 'top', null);
		expect(await pane.text()).toBe(NOTE);
		await app.evaluate(
			'(app.plugins.plugins["flow-outliner"].settings.dragItems = true, app.workspace.updateOptions(), true)',
		);
	});

	it('shows the drop indicator while the item is held over a place', async () => {
		const pane = await open(NOTE);
		const hold = await holdOver(pane, 3, 0, 'top');
		expect(await pane.indicatorCount()).toBe(1);
		await app.holdButton('release', hold.x, hold.y);
	});

	it('shows no drop indicator over the item itself', async () => {
		const pane = await open(NOTE);
		const hold = await holdOver(pane, 0, 2, 'top');
		expect(await pane.indicatorCount()).toBe(0);
		await app.holdButton('release', hold.x, hold.y);
	});

	it('moves nothing when Escape is pressed before the button is released', async () => {
		const pane = await open(NOTE);
		const hold = await holdOver(pane, 3, 0, 'top');
		await app.pressKey('escape', false, false);
		await app.holdButton('release', hold.x, hold.y);
		await wait(150);
		expect(await pane.text()).toBe(NOTE);
		expect(await pane.indicatorCount()).toBe(0);
	});

	it('drops an item as a sibling after a folded item with children', async () => {
		const pane = await open(NOTE);
		await app.evaluate(
			'(app.workspace.activeEditor.editor.setCursor({ line: 0, ch: 3 }), app.commands.executeCommandById("flow-outliner:fold-item"), true)',
		);
		await wait(150);
		await dragTo(pane, 4, 0, 'bottom', null);
		expect(await pane.text()).toBe('- a\n\t- b\n\t\t- c\n- e\n- d');
	});

	it('moves an item to the note in the other pane', async () => {
		const id = Date.now();
		await app.evaluate(
			`(async () => { const left = await app.vault.create('left-${id}.md', '- a\\n\\t- a1\\n- b'); const right = await app.vault.create('right-${id}.md', '- x\\n- y'); await app.workspace.getLeaf(false).openFile(left); await app.workspace.getLeaf('split', 'vertical').openFile(right); return true; })()`,
		);
		await wait(400);
		const left = NotePane.of(app, `left-${id}.md`);
		const right = NotePane.of(app, `right-${id}.md`);
		const grip = await left.bulletPoint(0);
		const box = await right.lineBox(0);
		const bullet = await right.bulletPoint(0);
		const target = { x: bullet.x, y: box.bottom - (box.bottom - box.top) * 0.2 };
		await app.drag([grip, { x: (grip.x + target.x) / 2, y: (grip.y + target.y) / 2 }, target]);
		await wait(300);
		expect(await right.text()).toBe('- x\n- a\n\t- a1\n- y');
		expect(await left.text()).toBe('- b');
	});

	it('keeps a folded item folded after it moves', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await wait(200);
		const pane = NotePane.of(app, await editor.path());
		await editor.caret(0, 3);
		await editor.runCommand('fold-item');
		await wait(150);
		await dragTo(pane, 0, 4, 'bottom', null);
		expect(await pane.text()).toBe('- d\n- e\n- a\n\t- b\n\t\t- c');
		expect(await editor.folds()).toEqual([{ from: 2, to: 4 }]);
	});
});
