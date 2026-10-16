import { describe, expect, it } from 'vitest';
import { dropDestination, type DropHover } from '../../src/outline/drop-target';
import { parseOutline } from '../../src/outline/outline-tree';

const NOTE = ['- a', '  - b', '    - c', '  - d', '- e'];
const tree = parseOutline(NOTE, 4);
const chain = parseOutline(['- a', '  - b', '    - c', '- z'], 4);

/** Describes the item that starts on a line as the dragged one. */
const dragged = (note: ReturnType<typeof parseOutline>, startLine: number) => {
	const item = note.nodes.find((node) => node.startLine === startLine);
	return item ? { startLine: item.startLine, endLine: item.endLine } : null;
};

const hover = (overrides: Partial<DropHover>): DropHover => ({
	line: 4,
	half: 'bottom',
	depthShift: 0,
	targetFolded: false,
	...overrides,
});

describe('dropDestination above and inside', () => {
	it('drops before the hovered item over its top half', () => {
		expect(dropDestination(tree, dragged(tree, 4), hover({ line: 1, half: 'top' }))).toEqual({
			kind: 'before',
			targetLine: 1,
		});
	});

	it('uses the item that holds a continuation line', () => {
		const lines = ['- a', '  more', '- b'];
		expect(
			dropDestination(
				parseOutline(lines, 4),
				{ startLine: 2, endLine: 2 },
				hover({ line: 1, half: 'top' }),
			),
		).toEqual({ kind: 'before', targetLine: 0 });
	});

	it.each([
		['the dragged item', 1],
		['its descendant', 2],
	])('has no place on %s', (_name, line) => {
		expect(dropDestination(tree, dragged(tree, 1), hover({ line, half: 'top' }))).toBeNull();
		expect(dropDestination(tree, dragged(tree, 1), hover({ line, half: 'bottom' }))).toBeNull();
	});

	it('has no place on a line outside every item', () => {
		const lines = ['- a', '', 'plain', '- b'];
		expect(
			dropDestination(
				parseOutline(lines, 4),
				{ startLine: 3, endLine: 3 },
				hover({ line: 2 }),
			),
		).toBeNull();
	});

	it('allows every item when the dragged item comes from another note', () => {
		expect(dropDestination(tree, null, hover({ line: 2, half: 'top' }))).toEqual({
			kind: 'before',
			targetLine: 2,
		});
	});
});

describe('dropDestination below', () => {
	it('drops after a childless item at its level by default', () => {
		expect(dropDestination(tree, dragged(tree, 4), hover({ line: 2 }))).toEqual({
			kind: 'after',
			targetLine: 2,
		});
	});

	it('drops as the first child of an item that shows its children by default', () => {
		expect(dropDestination(tree, dragged(tree, 4), hover({ line: 0 }))).toEqual({
			kind: 'first-child',
			targetLine: 0,
		});
	});

	it('drops after a folded item with children by default', () => {
		expect(
			dropDestination(tree, dragged(tree, 4), hover({ line: 0, targetFolded: true })),
		).toEqual({
			kind: 'after',
			targetLine: 0,
		});
	});

	it('drops as a child of a childless item when the pointer is one level deeper', () => {
		expect(dropDestination(tree, dragged(tree, 4), hover({ line: 2, depthShift: 1 }))).toEqual({
			kind: 'first-child',
			targetLine: 2,
		});
	});

	it('drops after the parent when the pointer is one level shallower and the item ends its parent', () => {
		expect(dropDestination(tree, dragged(tree, 4), hover({ line: 3, depthShift: -1 }))).toEqual(
			{
				kind: 'after',
				targetLine: 0,
			},
		);
	});

	it('climbs as many levels as the pointer asks while the item ends each parent', () => {
		expect(
			dropDestination(chain, dragged(chain, 3), hover({ line: 2, depthShift: -2 })),
		).toEqual({
			kind: 'after',
			targetLine: 0,
		});
		expect(
			dropDestination(chain, dragged(chain, 3), hover({ line: 2, depthShift: -1 })),
		).toEqual({
			kind: 'after',
			targetLine: 1,
		});
	});

	it('stops climbing at the shallowest level that is possible', () => {
		expect(
			dropDestination(chain, dragged(chain, 3), hover({ line: 2, depthShift: -9 })),
		).toEqual({
			kind: 'after',
			targetLine: 0,
		});
	});

	it('cannot climb out of a parent that has later children', () => {
		expect(dropDestination(tree, dragged(tree, 4), hover({ line: 2, depthShift: -1 }))).toEqual(
			{
				kind: 'after',
				targetLine: 1,
			},
		);
	});

	it('keeps the level of the item when the pointer is at its level', () => {
		expect(dropDestination(tree, dragged(tree, 4), hover({ line: 3, depthShift: 0 }))).toEqual({
			kind: 'after',
			targetLine: 3,
		});
	});

	it('keeps the first child place for an item that shows its children whatever the pointer says', () => {
		expect(dropDestination(tree, dragged(tree, 4), hover({ line: 0, depthShift: -3 }))).toEqual(
			{
				kind: 'first-child',
				targetLine: 0,
			},
		);
	});
});
