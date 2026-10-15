import { foldedRanges } from '@codemirror/language';
import { beforeEach, describe, expect, it } from 'vitest';
import { registerFoldCommands } from '../../src/commands/fold-commands';
import { Notice, Plugin } from '../mocks/obsidian';
import { FakeZoomTarget } from '../support/fake-zoom-target';

const NOTE = ['intro', '- a', '  - b', '- c'].join('\n');
const at = (text: string) => NOTE.indexOf(text);

const commands = () => {
	const plugin = new Plugin();
	registerFoldCommands(plugin as never);
	return new Map(plugin.commands.map((command) => [command.id, command]));
};

const run = (id: string, target: FakeZoomTarget, checking: boolean) =>
	commands().get(id)?.editorCheckCallback?.(checking, { cm: target }, {});

const foldCount = (target: FakeZoomTarget) => {
	let count = 0;
	foldedRanges(target.state).between(0, NOTE.length, () => {
		count += 1;
	});
	return count;
};

beforeEach(() => {
	Notice.shown.length = 0;
});

describe('fold commands', () => {
	it('registers stable ids and sentence case names', () => {
		expect([...commands().values()].map(({ id, name }) => [id, name])).toEqual([
			['fold-item', 'Fold item'],
			['unfold-item', 'Unfold item'],
			['fold-all', 'Fold all items'],
			['unfold-all', 'Unfold all items'],
		]);
	});

	it.each(['fold-item', 'unfold-item', 'fold-all', 'unfold-all'])(
		'%s is unavailable in an editor without the extension',
		(id) => {
			const callback = commands().get(id)?.editorCheckCallback;
			expect(callback?.(true, {}, {})).toBe(false);
			expect(callback?.(false, {}, {})).toBe(false);
		},
	);

	it.each(['fold-item', 'unfold-item', 'fold-all', 'unfold-all'])(
		'%s is available in an editor with the extension and does not act while checking',
		(id) => {
			const target = new FakeZoomTarget(NOTE, at('a'));
			expect(run(id, target, true)).toBe(true);
			expect(foldCount(target)).toBe(0);
		},
	);

	it('folds and unfolds the item at the cursor and reports it ran', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		expect(run('fold-item', target, false)).toBe(true);
		expect(foldCount(target)).toBe(1);
		expect(run('unfold-item', target, false)).toBe(true);
		expect(foldCount(target)).toBe(0);
		expect(Notice.shown).toEqual([]);
	});

	it('folds and unfolds everything', () => {
		const target = new FakeZoomTarget(NOTE, at('a'));
		run('fold-all', target, false);
		expect(foldCount(target)).toBe(1);
		run('unfold-all', target, false);
		expect(foldCount(target)).toBe(0);
	});

	it('explains that a leaf has no children to fold or unfold', () => {
		const target = new FakeZoomTarget(NOTE, at('c'));
		run('fold-item', target, false);
		run('unfold-item', target, false);
		expect(Notice.shown).toEqual([
			'This item has no children to fold.',
			'This item has no children to unfold.',
		]);
	});

	it('asks for a list item when the cursor is not in one', () => {
		run('fold-item', new FakeZoomTarget(NOTE, 1), false);
		expect(Notice.shown).toEqual(['Place the cursor in a list item.']);
	});
});
