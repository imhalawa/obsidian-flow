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

const NOTE = '- Root\n\t- Child A\n\t\t- Grand 1\n\t- Child B';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const THEME_OVERRIDE = `(() => { const style = activeDocument.createElement('style'); style.id = 'theme-indent'; style.textContent = '.markdown-source-view.mod-cm6 .cm-editor { --list-indent: 90px; }'; activeDocument.head.append(style); return true; })()`;

const REMOVE_OVERRIDE = '(activeDocument.getElementById("theme-indent")?.remove(), true)';

/** Reads the width of every indent step of the first lines and the gap between each fold arrow and its bullet. */
const MEASURE = `(() => {
	const cm = app.workspace.activeEditor.editor.cm;
	const lines = Array.from(cm.contentDOM.querySelectorAll('.cm-line'));
	return {
		steps: lines.flatMap((line) => Array.from(line.querySelectorAll('.cm-indent')).map((step) => Math.round(step.getBoundingClientRect().width))),
		gaps: lines.flatMap((line) => { const fold = line.querySelector('.cm-fold-indicator'); const bullet = line.querySelector('.list-bullet'); return fold && bullet ? [Math.round(bullet.getBoundingClientRect().left - fold.getBoundingClientRect().left)] : []; }),
		size: parseFloat(getComputedStyle(cm.contentDOM).fontSize),
	};
})()`;

interface Measured {
	steps: number[];
	gaps: number[];
	size: number;
}

describe('indent spacing in real Obsidian', () => {
	it('gives every level the same width whatever the theme sets', async () => {
		await app.evaluate(THEME_OVERRIDE);
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(0, 2);
		await wait(300);
		const measured = await app.evaluate<Measured>(MEASURE);
		expect(measured.steps.length).toBeGreaterThan(0);
		for (const step of measured.steps) expect(step).toBeCloseTo(measured.size * 2.25, 0);
		await app.evaluate(REMOVE_OVERRIDE);
	});

	it('keeps the fold arrow the same distance from every bullet', async () => {
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(0, 2);
		await wait(300);
		const measured = await app.evaluate<Measured>(MEASURE);
		expect(new Set(measured.gaps).size).toBe(1);
	});

	it('leaves the theme alone when the setting is off', async () => {
		await app.evaluate(THEME_OVERRIDE);
		await app.evaluate(
			'(app.plugins.plugins["roamer"].settings.fixedIndentSpacing = false, app.workspace.updateOptions(), true)',
		);
		const editor = await NoteEditor.open(app, NOTE);
		await editor.caret(0, 2);
		await wait(300);
		const measured = await app.evaluate<Measured>(MEASURE);
		for (const step of measured.steps) expect(step).toBe(90);
		await app.evaluate(REMOVE_OVERRIDE);
		await app.evaluate(
			'(app.plugins.plugins["roamer"].settings.fixedIndentSpacing = true, app.workspace.updateOptions(), true)',
		);
	});
});
