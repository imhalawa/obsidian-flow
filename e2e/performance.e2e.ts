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

const report = (label: string, value: string) => process.stdout.write(`PERF ${label}: ${value}\n`);

/** Builds a nested list: a few top items, each with a tree of children three wide and a few levels deep. */
function bigNote(tops: number, levels: number): string {
	const lines: string[] = [];
	const add = (depth: number, label: string) => {
		lines.push(`${'\t'.repeat(depth)}- item ${label} lorem ipsum dolor sit amet consectetur`);
		if (depth + 1 >= levels) return;
		for (let child = 0; child < 3; child += 1) add(depth + 1, `${label}.${child}`);
	};
	for (let top = 0; top < tops; top += 1) add(0, `${top}`);
	return lines.join('\n');
}

const FRAMES = `const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));`;

describe('performance on a large note', () => {
	const NOTE = bigNote(8, 6);
	const LINES = NOTE.split('\n').length;
	let editor: NoteEditor;

	beforeAll(async () => {
		const started = Date.now();
		editor = await NoteEditor.open(app, NOTE);
		await app.evaluate(
			`new Promise((resolve) => { const check = () => app.workspace.activeEditor?.editor?.cm?.state.doc.lines === ${LINES} ? resolve(true) : setTimeout(check, 20); check(); })`,
		);
		report('lines', String(LINES));
		report('open note ms', String(Date.now() - started));
	});

	const measure = (body: string) =>
		app.evaluate<number>(
			`(async () => { ${FRAMES} const editor = app.workspace.activeEditor.editor; ${body} })()`,
		);

	it('zooms into an item and out again quickly', async () => {
		const zoomIn = await measure(
			`editor.setCursor({ line: ${Math.floor(LINES / 2)}, ch: 3 }); await frame(); const t = performance.now(); app.commands.executeCommandById('roamer:zoom-in'); await frame(); return performance.now() - t;`,
		);
		const zoomOut = await measure(
			`const t = performance.now(); app.commands.executeCommandById('roamer:zoom-reset'); await frame(); return performance.now() - t;`,
		);
		report('zoom in ms', zoomIn.toFixed(0));
		report('zoom reset ms', zoomOut.toFixed(0));
		expect(zoomIn).toBeLessThan(500);
		expect(zoomOut).toBeLessThan(500);
	});

	it('folds and unfolds every item quickly', async () => {
		const fold = await measure(
			`editor.setCursor({ line: 0, ch: 0 }); const t = performance.now(); app.commands.executeCommandById('roamer:fold-all'); await frame(); return performance.now() - t;`,
		);
		const unfold = await measure(
			`const t = performance.now(); app.commands.executeCommandById('roamer:unfold-all'); await frame(); return performance.now() - t;`,
		);
		report('fold all ms', fold.toFixed(0));
		report('unfold all ms', unfold.toFixed(0));
		expect(fold).toBeLessThan(1500);
		expect(unfold).toBeLessThan(1500);
	});

	it('keeps typing responsive in a zoomed note', async () => {
		await editor.caret(Math.floor(LINES / 2), 3);
		await editor.runCommand('zoom-in');
		const result = await app.evaluate<{ average: number; worst: number; p95: number }>(
			`(async () => { ${FRAMES} const cm = app.workspace.activeEditor.editor.cm; const costs = []; let at = cm.state.selection.main.head; for (let i = 0; i < 100; i += 1) { const t = performance.now(); cm.dispatch({ changes: { from: at, insert: 'x' }, selection: { anchor: at + 1 }, userEvent: 'input.type' }); await frame(); costs.push(performance.now() - t); at += 1; } costs.sort((a, b) => a - b); return { average: costs.reduce((a, b) => a + b, 0) / costs.length, worst: costs[costs.length - 1], p95: costs[Math.floor(costs.length * 0.95)] }; })()`,
		);
		report('keystroke avg ms (incl. 2 frames)', result.average.toFixed(1));
		report('keystroke p95 ms', result.p95.toFixed(1));
		report('keystroke worst ms', result.worst.toFixed(1));
		expect(result.average).toBeLessThan(80);
		expect(result.p95).toBeLessThan(150);
		await editor.runCommand('zoom-reset');
	});

	it('keeps pointer movement over the list cheap', async () => {
		const result = await app.evaluate<{ average: number; worst: number }>(
			`(async () => { const cm = app.workspace.activeEditor.editor.cm; const box = cm.contentDOM.getBoundingClientRect(); const costs = []; for (let i = 0; i < 300; i += 1) { const x = box.left + 20 + (i % 40) * 6; const y = box.top + 10 + ((i * 7) % Math.max(50, Math.min(box.height, 600))); const t = performance.now(); cm.contentDOM.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true, buttons: 0 })); costs.push(performance.now() - t); } costs.sort((a, b) => a - b); return { average: costs.reduce((a, b) => a + b, 0) / costs.length, worst: costs[costs.length - 1] }; })()`,
		);
		report('mousemove avg ms', result.average.toFixed(2));
		report('mousemove worst ms', result.worst.toFixed(2));
		expect(result.average).toBeLessThan(5);
	});

	it('moves an item in a large note quickly', async () => {
		await editor.caret(Math.floor(LINES / 2), 3);
		const moved = await measure(
			`const t = performance.now(); app.commands.executeCommandById('roamer:move-item-down'); await frame(); return performance.now() - t;`,
		);
		report('move item ms', moved.toFixed(0));
		expect(moved).toBeLessThan(500);
	});
});

describe('overhead compared with the plugin turned off', () => {
	const NOTE = bigNote(8, 6);

	const typing = () =>
		app.evaluate<number>(
			`(async () => { ${FRAMES} const cm = app.workspace.activeEditor.editor.cm; const costs = []; let at = 10; for (let i = 0; i < 80; i += 1) { const t = performance.now(); cm.dispatch({ changes: { from: at, insert: 'x' }, selection: { anchor: at + 1 }, userEvent: 'input.type' }); await frame(); costs.push(performance.now() - t); at += 1; } return costs.reduce((a, b) => a + b, 0) / costs.length; })()`,
		);

	it('adds little to typing in a large note', async () => {
		await NoteEditor.open(app, NOTE);
		await new Promise((resolve) => setTimeout(resolve, 500));
		const withPlugin = await typing();
		await app.evaluate('app.plugins.disablePlugin("roamer").then(() => true)');
		await new Promise((resolve) => setTimeout(resolve, 500));
		const without = await typing();
		await app.evaluate('app.plugins.enablePlugin("roamer").then(() => true)');
		report('typing with plugin ms', withPlugin.toFixed(1));
		report('typing without plugin ms', without.toFixed(1));
		expect(withPlugin).toBeLessThan(without * 1.5 + 5);
	});

	it('loads and unloads quickly', async () => {
		const timings = await app.evaluate<{ off: number; on: number }>(
			`(async () => { const a = performance.now(); await app.plugins.disablePlugin("roamer"); const b = performance.now(); await app.plugins.enablePlugin("roamer"); const c = performance.now(); return { off: b - a, on: c - b }; })()`,
		);
		report('plugin unload ms', timings.off.toFixed(0));
		report('plugin load ms', timings.on.toFixed(0));
		expect(timings.on).toBeLessThan(500);
		expect(timings.off).toBeLessThan(500);
	});
});
