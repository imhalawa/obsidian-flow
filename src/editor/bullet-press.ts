export interface PressPoint {
	x: number;
	y: number;
}

export const DRAG_START_DISTANCE = 4;

/** Tells whether the pointer has moved far enough from where a bullet was pressed for the press to become a drag. */
export function hasStartedDragging(start: PressPoint, pointer: PressPoint): boolean {
	return Math.hypot(pointer.x - start.x, pointer.y - start.y) >= DRAG_START_DISTANCE;
}
