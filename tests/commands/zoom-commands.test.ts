import { beforeEach, describe, expect, it } from 'vitest';
import { registerZoomCommands } from '../../src/commands/zoom-commands';
import { zoomChange } from '../../src/editor/zoom-field';
import { Notice, Plugin } from '../mocks/obsidian';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['intro', '- a', '  - b', '    - c'].join('\n');
const at = (text: string) => NOTE.indexOf(text);

const commands = () => {
	const plugin = new Plugin();
	registerZoomCommands(plugin as never);
	return new Map(plugin.commands.map((command) => [command.id, command]));
};

const run = (id: string, target: FakeZoomTarget, checking: boolean) =>
	commands().get(id)?.editorCheckCallback?.(checking, { cm: target }, {});

const zoomIntoLine = (target: FakeZoomTarget, startLine: number) =>
	target.dispatch({ effects: zoomChange.of({ startLine, navigation: 'visit' }) });

beforeEach(() => {
	Notice.shown.length = 0;
});

describe('zoom commands', () => {
	it('registers stable ids and sentence case names', () => {
		expect([...commands().values()].map(({ id, name }) => [id, name])).toEqual([
			['zoom-in', 'Zoom in'],
			['zoom-out', 'Zoom out'],
			['zoom-reset', 'Show the whole note'],
			['zoom-history-back', 'Zoom back'],
			['zoom-history-forward', 'Zoom forward'],
		]);
	});

	it.each(['zoom-in', 'zoom-out', 'zoom-reset', 'zoom-history-back', 'zoom-history-forward'])(
		'%s is unavailable in an editor without the zoom extension',
		(id) => {
			const callback = commands().get(id)?.editorCheckCallback;
			expect(callback?.(true, {}, {})).toBe(false);
			expect(callback?.(false, {}, {})).toBe(false);
		},
	);

	it('offers zoom in everywhere so it can explain itself', () => {
		expect(run('zoom-in', new FakeZoomTarget(NOTE, 0), true)).toBe(true);
	});

	it.each(['zoom-out', 'zoom-reset'])('offers %s only while zoomed', (id) => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		expect(run(id, target, true)).toBe(false);
		zoomIntoLine(target, 1);
		expect(run(id, target, true)).toBe(true);
	});

	it('offers history commands only when there is somewhere to go', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		expect(run('zoom-history-back', target, true)).toBe(false);
		expect(run('zoom-history-forward', target, true)).toBe(false);
		zoomIntoLine(target, 1);
		expect(run('zoom-history-back', target, true)).toBe(true);
		expect(run('zoom-history-forward', target, true)).toBe(false);
		run('zoom-history-back', target, false);
		expect(run('zoom-history-forward', target, true)).toBe(true);
	});

	it('does not change the editor while checking', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		run('zoom-in', target, true);
		expect(target.zoom).toBeNull();
	});

	it('zooms in quietly and reports it ran', () => {
		const target = new FakeZoomTarget(NOTE, at('b'));
		expect(run('zoom-in', target, false)).toBe(true);
		expect(target.zoom?.crumbs.map((crumb) => crumb.text)).toEqual(['a', 'b']);
		expect(Notice.shown).toEqual([]);
	});

	it('tells the user to place the cursor in a list item', () => {
		const target = new FakeZoomTarget(NOTE, 0);
		expect(run('zoom-in', target, false)).toBe(true);
		expect(Notice.shown).toEqual(['Place the cursor in a list item or a heading to zoom.']);
	});

	it('zooms out and resets', () => {
		const target = new FakeZoomTarget(NOTE, at('c'));
		run('zoom-in', target, false);
		run('zoom-out', target, false);
		expect(target.zoom?.crumbs.map((crumb) => crumb.text)).toEqual(['a', 'b']);
		run('zoom-reset', target, false);
		expect(target.zoom).toBeNull();
	});

	it('steps back and forward through the zoom history', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		run('zoom-in', target, false);
		target.dispatch({ selection: { anchor: at('c') } });
		run('zoom-in', target, false);
		run('zoom-history-back', target, false);
		expect(target.zoom?.crumbs.map((crumb) => crumb.text)).toEqual(['a']);
		run('zoom-history-forward', target, false);
		expect(target.zoom?.crumbs.map((crumb) => crumb.text)).toEqual(['a', 'b', 'c']);
	});
});
