import { describe, expect, it } from 'vitest';
import { parseSpecs, toKeyPress } from '../../e2e/support/behaviour-spec';

const SOURCE = [
	'# enter should add an item',
	'',
	'- platform: `linux`',
	'- setting: `stickCursor="never"`',
	'- applyState:',
	'',
	'```md',
	'- one|',
	'```',
	'',
	'- keydown: `Enter`',
	'- assertState:',
	'',
	'```md',
	'- one',
	'- |',
	'```',
	'',
	'# the command moves the item',
	'',
	'- applyState:',
	'',
	'```md',
	'- one|',
	'- two',
	'```',
	'',
	'- execute: `obsidian-outliner:move-list-item-down`',
].join('\n');

describe('parseSpecs', () => {
	it('returns nothing for text without a title', () => {
		expect(parseSpecs('- applyState:\n')).toEqual([]);
	});

	it('reads the title, platform and settings', () => {
		const [spec] = parseSpecs(SOURCE);
		expect([spec?.title, spec?.platform, spec?.settings]).toEqual([
			'enter should add an item',
			'linux',
			['stickCursor="never"'],
		]);
	});

	it('reads the steps in order', () => {
		expect(parseSpecs(SOURCE)[0]?.steps).toEqual([
			{ kind: 'apply', state: '- one|' },
			{ kind: 'key', shortcut: 'Enter' },
			{ kind: 'assert', state: '- one\n- |' },
		]);
	});

	it('reads a command step and leaves the platform empty when none is given', () => {
		const spec = parseSpecs(SOURCE)[1];
		expect(spec?.platform).toBeNull();
		expect(spec?.steps[1]).toEqual({
			kind: 'execute',
			command: 'obsidian-outliner:move-list-item-down',
		});
	});

	it('does not read a line inside a state as a title', () => {
		const [spec] = parseSpecs('# a\n\n- applyState:\n\n```md\n# not a title|\n```\n');
		expect(spec?.steps).toEqual([{ kind: 'apply', state: '# not a title|' }]);
	});
});

describe('toKeyPress', () => {
	it.each([
		['Enter', { name: 'enter', shift: false, control: false }],
		['Shift-Enter', { name: 'enter', shift: true, control: false }],
		['Shift-Tab', { name: 'tab', shift: true, control: false }],
		['Ctrl-KeyA', { name: 'a', shift: false, control: true }],
		['Mod-KeyA', { name: 'a', shift: false, control: true }],
		['Shift-Home', { name: 'home', shift: true, control: false }],
		['Backspace', { name: 'backspace', shift: false, control: false }],
	])('maps %s', (shortcut, expected) => {
		expect(toKeyPress(shortcut)).toEqual(expected);
	});

	it.each(['Cmd-Shift-ArrowLeft', 'ArrowLeft', 'Cmd-KeyA', 'Alt-Enter'])(
		'does not support %s',
		(shortcut) => {
			expect(toKeyPress(shortcut)).toBeNull();
		},
	);
});
