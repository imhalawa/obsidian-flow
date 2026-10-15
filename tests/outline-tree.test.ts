import { describe, expect, it } from 'vitest';
import { parseOutline } from '../src/outline/outline-tree';
import { outlineShape } from './support/outline-shape';
import { lezerShape } from './support/lezer-shape';
import { randomOutline, type IndentStyle } from './support/random-outline';

const shapeOf = (lines: string[], tabSize: number) =>
	outlineShape(parseOutline(lines, tabSize).roots, 0);

const rangesOf = (lines: string[]) =>
	parseOutline(lines, 4).nodes.map((node) => [node.startLine, node.endLine]);

describe('parseOutline basics', () => {
	it('returns an empty tree for no lines', () => {
		expect(parseOutline([], 4)).toEqual({ roots: [], nodes: [] });
	});

	it.each([[['plain text']], [['-no space', '1.no space']], [['# heading', '']]])(
		'finds no items in %j',
		(lines) => {
			expect(parseOutline(lines, 4).nodes).toEqual([]);
		},
	);

	it('describes a single item', () => {
		const [node] = parseOutline(['- a'], 4).nodes;
		expect(node).toEqual({
			startLine: 0,
			endLine: 0,
			indent: '',
			indentColumns: 0,
			marker: '-',
			contentColumn: 2,
			checked: null,
			text: 'a',
			parent: null,
			children: [],
		});
	});

	it('reads task state and strips the checkbox from the text', () => {
		const [node] = parseOutline(['- [x] done'], 4).nodes;
		expect([node?.checked, node?.text]).toEqual([true, 'done']);
	});

	it('links parents and children and lists nodes in document order', () => {
		const tree = parseOutline(['- a', '  - b', '- c'], 4);
		const [a, b, c] = tree.nodes;
		expect(tree.roots).toEqual([a, c]);
		expect(a?.children).toEqual([b]);
		expect(b?.parent).toBe(a);
		expect(c?.parent).toBeNull();
	});
});

describe('parseOutline nesting', () => {
	it.each([
		['siblings', ['- a', '- b'], ['0:a', '0:b']],
		[
			'nested then back to the top',
			['- a', '\t- b', '\t\t- c', '- d'],
			['0:a', '1:b', '2:c', '0:d'],
		],
		[
			'dedent by two levels',
			['- a', '  - b', '    - c', '  - d', '- e'],
			['0:a', '1:b', '2:c', '1:d', '0:e'],
		],
		['indent below the content column is a sibling', ['- a', ' - b'], ['0:a', '0:b']],
		['indent at the content column is a child', ['- a', '  - b'], ['0:a', '1:b']],
		['ordered item needs its wider content column', ['1. a', '  - b'], ['0:a', '0:b']],
		['ordered item child at its content column', ['1. a', '   - b'], ['0:a', '1:b']],
		['paren ordered marker', ['1) a', '   - b'], ['0:a', '1:b']],
		['wide gap raises the content column', ['-   a', '  - b'], ['0:a', '0:b']],
		['wide gap child', ['-   a', '    - b'], ['0:a', '1:b']],
		['gap over four columns counts as one space', ['-      a', '  - b'], ['0:a', '1:b']],
		[
			'gap of exactly four columns sets the content column',
			['-    a', '   - b'],
			['0:a', '0:b'],
		],
		['wide gap content column is one past the marker', ['-      a', ' - b'], ['0:a', '0:b']],
		['task item nests like a plain item', ['- [ ] a', '  - b'], ['0:a', '1:b']],
		['tab after a space reaches the next tab stop', ['- a', ' \t- b'], ['0:a', '1:b']],
		['bullet under ordered', ['1. a', '   - b', '   - c'], ['0:a', '1:b', '1:c']],
		['child of a late sibling', ['- a', '- b', '  - c'], ['0:a', '0:b', '1:c']],
	])('%s', (_name, lines, expected) => {
		expect(shapeOf(lines, 4)).toEqual(expected);
	});

	it('counts a tab as the given tab size', () => {
		expect(shapeOf(['- a', '\t- b'], 2)).toEqual(['0:a', '1:b']);
		expect(shapeOf(['- a', '\t- b'], 1)).toEqual(['0:a', '0:b']);
	});

	it('records indent text and columns', () => {
		const [, b] = parseOutline(['- a', '\t- b'], 4).nodes;
		expect([b?.indent, b?.indentColumns]).toEqual(['\t', 4]);
	});

	it('records the content column of a wide gap', () => {
		const [a] = parseOutline(['-   a'], 4).nodes;
		expect(a?.contentColumn).toBe(4);
	});

	it('records the content column of a tab gap', () => {
		const [a] = parseOutline(['-\ta'], 4).nodes;
		expect(a?.contentColumn).toBe(4);
	});
});

describe('parseOutline line ranges', () => {
	it.each([
		['one item', ['- a'], [[0, 0]]],
		[
			'indented continuation',
			['- a', '  more', '- b'],
			[
				[0, 1],
				[2, 2],
			],
		],
		[
			'lazy continuation',
			['- a', 'more', '- b'],
			[
				[0, 1],
				[2, 2],
			],
		],
		[
			'nested items end inside their parent',
			['- a', '  - b', '  - c', '- d'],
			[
				[0, 2],
				[1, 1],
				[2, 2],
				[3, 3],
			],
		],
		[
			'blank line between items stays with the item above',
			['- a', '', '- b'],
			[
				[0, 1],
				[2, 2],
			],
		],
		['trailing blank line is outside the item', ['- a', ''], [[0, 0]]],
		['blank line before plain text is outside the item', ['- a', '', 'text'], [[0, 0]]],
		[
			'indented paragraph after a blank line',
			['- a', '', '  para', '- b'],
			[
				[0, 2],
				[3, 3],
			],
		],
		[
			'paragraph for the parent after a nested item',
			['- a', '  - b', '', '  para'],
			[
				[0, 3],
				[1, 1],
			],
		],
		[
			'paragraph for the nested item',
			['- a', '  - b', '', '    para'],
			[
				[0, 3],
				[1, 3],
			],
		],
		[
			'heading ends the list',
			['- a', '# H', '- b'],
			[
				[0, 0],
				[2, 2],
			],
		],
		[
			'quote ends the list',
			['- a', '> q', '- b'],
			[
				[0, 0],
				[2, 2],
			],
		],
		[
			'thematic break ends the list',
			['- a', '***', '- b'],
			[
				[0, 0],
				[2, 2],
			],
		],
	])('%s', (_name, lines, expected) => {
		expect(rangesOf(lines)).toEqual(expected);
	});

	it('starts a new list after text at the left margin following a blank line', () => {
		const tree = parseOutline(['- a', '', 'para', '- b'], 4);
		expect(tree.roots).toHaveLength(2);
		expect(tree.nodes.map((node) => node.parent)).toEqual([null, null]);
	});

	it.each([
		['text # x'],
		['a > b'],
		['a ``` b'],
		['a ~~~ b'],
		['a --- b'],
		['a * * *'],
		['~~ x'],
		['`` x'],
		['*** x'],
	])('keeps the plain line %j inside the item', (text) => {
		expect(rangesOf(['- a', text])).toEqual([[0, 1]]);
	});

	it.each([[' # H'], ['## H'], ['#'], ['***  '], ['*  *  *']])(
		'ends the list at the interrupting line %j',
		(text) => {
			expect(rangesOf(['- a', text, '- b'])).toEqual([
				[0, 0],
				[2, 2],
			]);
		},
	);

	it('gives an interrupting line to the nearest containing item', () => {
		expect(rangesOf(['- a', '  - b', '   # H'])).toEqual([
			[0, 2],
			[1, 1],
		]);
	});

	it('starts a fresh list after a thematic break', () => {
		expect(shapeOf(['- a', '***', '  - b'], 4)).toEqual(['0:a', '0:b']);
	});

	it('ends the list at plain text after a whitespace only line', () => {
		expect(rangesOf(['- a', '  ', 'text'])).toEqual([[0, 0]]);
	});

	it('ends a nested item with its parent at the end of the note', () => {
		expect(rangesOf(['- a', '  - b'])).toEqual([
			[0, 1],
			[1, 1],
		]);
	});

	it('treats a whitespace only line as blank', () => {
		expect(rangesOf(['- a', '  ', '- b'])).toEqual([
			[0, 1],
			[2, 2],
		]);
	});

	it('keeps an indented heading inside the item', () => {
		expect(rangesOf(['- a', '  # H', '- b'])).toEqual([
			[0, 1],
			[2, 2],
		]);
	});
});

describe('parseOutline code, front matter and thematic breaks', () => {
	it('ignores list syntax inside a fenced block in an item', () => {
		const lines = ['- a', '  ```', '  - x', '  ```', '- b'];
		expect(shapeOf(lines, 4)).toEqual(['0:a', '0:b']);
		expect(rangesOf(lines)).toEqual([
			[0, 3],
			[4, 4],
		]);
	});

	it('ignores list syntax inside a top level fenced block', () => {
		expect(shapeOf(['```', '- x', '```', '- y'], 4)).toEqual(['0:y']);
	});

	it('supports tilde fences', () => {
		expect(shapeOf(['~~~', '- x', '~~~', '- y'], 4)).toEqual(['0:y']);
	});

	it('does not close a fence with a different character', () => {
		expect(shapeOf(['- a', '  ```', '  ~~~', '  - x'], 4)).toEqual(['0:a']);
	});

	it('does not close a fence with a shorter run', () => {
		expect(shapeOf(['````', '```', '- x'], 4)).toEqual([]);
	});

	it('lets an unclosed fence swallow the rest of the note', () => {
		expect(shapeOf(['- a', '  ```', '  - x', '- b'], 4)).toEqual(['0:a']);
	});

	it('keeps a fenced block at the end of the note with its item', () => {
		expect(rangesOf(['- a', '  ```', '  x', '  ```'])).toEqual([[0, 3]]);
	});

	it('keeps blank lines inside a fence with the item', () => {
		expect(rangesOf(['- a', '  ```', '', '  ```', '- b'])).toEqual([
			[0, 3],
			[4, 4],
		]);
	});

	it('does not close a fence with a line that has an info string', () => {
		expect(shapeOf(['```', '``` js', '- x', '```', '- y'], 4)).toEqual(['0:y']);
	});

	it.each([['text ```'], ['text ~~~'], ['``'], ['~~']])('does not open a fence at %j', (text) => {
		expect(shapeOf(['- a', `  ${text}`, '  - b'], 4)).toEqual(['0:a', '1:b']);
	});

	it('opens a fence that interrupts the list at the left margin', () => {
		expect(shapeOf(['- a', '```', '- x', '```', '- b'], 4)).toEqual(['0:a', '0:b']);
	});

	it('skips front matter', () => {
		const [a] = parseOutline(['---', 'tags:', '  - x', '---', '- a'], 4).nodes;
		expect([a?.text, a?.startLine]).toEqual(['a', 4]);
	});

	it('only reads front matter at the first line', () => {
		expect(shapeOf(['- a', 'text', '---', '- b'], 4)).toEqual(['0:a', '0:b']);
	});

	it('treats an unclosed front matter marker as a thematic break', () => {
		expect(shapeOf(['---', '- a'], 4)).toEqual(['0:a']);
	});

	it.each([
		['- a ***', 'a ***'],
		['- ---x', '---x'],
	])('keeps %j as an item', (line, text) => {
		expect(parseOutline([line], 4).nodes.map((node) => node.text)).toEqual([text]);
	});

	it.each([
		['---'],
		['***'],
		['* * *'],
		['- - -'],
		['___'],
		['  - - -'],
		['*  *  *'],
		['- - - '],
	])('does not read %j as an item', (line) => {
		expect(parseOutline([line], 4).nodes).toEqual([]);
	});

	it('does not read indented code as an item', () => {
		expect(shapeOf(['para', '', '    - code'], 4)).toEqual([]);
	});

	it('reads a deeply indented item inside a list as a child', () => {
		expect(shapeOf(['- a', '', '    - b'], 4)).toEqual(['0:a', '1:b']);
	});
});

const STYLES: { name: string; style: IndentStyle }[] = [
	{ name: 'tabs', style: { tabs: true, unit: 4 } },
	{ name: '2 spaces', style: { tabs: false, unit: 2 } },
	{ name: '4 spaces', style: { tabs: false, unit: 4 } },
];

const MARKER_SETS: { name: string; markers: string[] }[] = [
	{ name: 'dash only', markers: ['-'] },
	{ name: 'all bullets', markers: ['-', '*', '+'] },
	{ name: 'ordered only', markers: ['1.'] },
	{ name: 'bullets and ordered', markers: ['-', '1.'] },
];

const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

/** Returns the first seed whose parsed shape differs from Lezer, or null. */
function firstDisagreement(markers: string[], style: IndentStyle): number | null {
	for (const seed of SEEDS) {
		const lines = randomOutline(seed, markers, style);
		if (shapeOf(lines, 4).join() !== lezerShape(lines).join()) return seed;
	}
	return null;
}

describe('parseOutline agrees with the Lezer markdown parser', () => {
	describe.each(MARKER_SETS)('$name', ({ markers }) => {
		it.each(STYLES)('on $name documents', ({ style }) => {
			expect(firstDisagreement(markers, style)).toBeNull();
		});
	});
});
