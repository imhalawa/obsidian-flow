export interface HistoryWindow {
	history: {
		back: () => void;
		forward: () => void;
	};
}

export interface HistoryWrapperHost {
	isEnabled: () => boolean;
	step: (direction: 'back' | 'forward') => boolean;
}

type Direction = 'back' | 'forward';

const DIRECTIONS: Direction[] = ['back', 'forward'];

/** Tells whether a window has the history methods the wrapper needs. */
function hasHistory(win: HistoryWindow): boolean {
	const history = (win as Partial<HistoryWindow>).history;
	return (
		history !== undefined &&
		typeof history.back === 'function' &&
		typeof history.forward === 'function'
	);
}

/** Makes back and forward of a window step through the zoom history first and returns a function that undoes it. */
export function wrapHistory(win: HistoryWindow, host: HistoryWrapperHost): () => void {
	if (!hasHistory(win)) return () => undefined;
	const history = win.history;
	const installed = new Map<Direction, { original: () => void; wrapper: () => void }>();
	for (const direction of DIRECTIONS) {
		const original = history[direction];
		const wrapper = () => {
			if (host.isEnabled() && host.step(direction)) return;
			original.call(history);
		};
		history[direction] = wrapper;
		installed.set(direction, { original, wrapper });
	}
	return () => {
		for (const [direction, { original, wrapper }] of installed) {
			if (history[direction] === wrapper) history[direction] = original;
		}
	};
}
