import { describe, expect, it } from 'vitest';
import { DRAG_START_DISTANCE, hasStartedDragging } from '../../src/editor/bullet-press';

const START = { x: 100, y: 100 };

describe('hasStartedDragging', () => {
	it.each([
		['not at all', { x: 100, y: 100 }, false],
		['a little to the right', { x: 103, y: 100 }, false],
		['a little down', { x: 100, y: 103 }, false],
		['a little in both directions', { x: 102, y: 102 }, false],
		['exactly the start distance', { x: 100 + DRAG_START_DISTANCE, y: 100 }, true],
		['far to the left', { x: 60, y: 100 }, true],
		['far up', { x: 100, y: 40 }, true],
		['diagonally past the distance', { x: 103, y: 103 }, true],
	])('is decided for a pointer moved %s', (_name, pointer, expected) => {
		expect(hasStartedDragging(START, pointer)).toBe(expected);
	});

	it('starts dragging after 4 pixels', () => {
		expect(DRAG_START_DISTANCE).toBe(4);
	});
});
