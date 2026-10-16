import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorView } from '@codemirror/view';
import {
	foldIndicatorCenter,
	foldIndicatorOf,
	isOverFoldIndicator,
} from '../../src/editor/fold-indicator';

const insideIndicator = {
	closest: (selector: string) => (selector === '.cm-fold-indicator' ? {} : null),
};
const outsideIndicator = { closest: () => null };

describe('isOverFoldIndicator', () => {
	it('is true for an element inside the fold arrow of Obsidian', () => {
		expect(isOverFoldIndicator(insideIndicator)).toBe(true);
	});

	it('is false for an element outside the fold arrow', () => {
		expect(isOverFoldIndicator(outsideIndicator)).toBe(false);
	});

	it.each([
		['no target', null],
		['a target that is not an element', {}],
	])('is false for %s', (_name, target) => {
		expect(isOverFoldIndicator(target)).toBe(false);
	});
});

class FakeElement {}

interface FakeArrow {
	getBoundingClientRect: () => { left: number; right: number };
}

/** Builds a view whose line at the position holds the given fold arrow, or none. */
function viewWithArrow(arrow: FakeArrow | null, asText: boolean): EditorView {
	const line = {
		querySelector: (selector: string) => (selector === '.cm-fold-indicator svg' ? arrow : null),
	};
	const element = Object.assign(new FakeElement(), {
		closest: (selector: string) => (selector === '.cm-line' ? line : null),
	});
	const node = asText ? { parentElement: element } : element;
	return { domAtPos: () => ({ node }) } as unknown as EditorView;
}

describe('foldIndicatorCenter', () => {
	beforeEach(() => vi.stubGlobal('Element', FakeElement));
	afterEach(() => vi.unstubAllGlobals());

	const arrow = { getBoundingClientRect: () => ({ left: 10, right: 20 }) };

	it.each([
		['an element', false],
		['a text node', true],
	])('returns the middle of the arrow when the position is in %s', (_name, asText) => {
		expect(foldIndicatorCenter(viewWithArrow(arrow, asText), 0)).toBe(15);
	});

	it('returns null when the position is in a text node without a parent element', () => {
		const view = {
			domAtPos: () => ({ node: { parentElement: null } }),
		} as unknown as EditorView;
		expect(foldIndicatorCenter(view, 0)).toBeNull();
	});

	it('returns null when the position is not inside a line', () => {
		const outsideLine = Object.assign(new FakeElement(), { closest: () => null });
		const view = { domAtPos: () => ({ node: outsideLine }) } as unknown as EditorView;
		expect(foldIndicatorCenter(view, 0)).toBeNull();
	});

	it('returns null when the line has no arrow', () => {
		expect(foldIndicatorCenter(viewWithArrow(null, false), 0)).toBeNull();
	});
});

describe('foldIndicatorOf', () => {
	beforeEach(() => vi.stubGlobal('Element', FakeElement));
	afterEach(() => vi.unstubAllGlobals());

	const viewWithIndicator = (indicator: object | null): EditorView => {
		const line = {
			querySelector: (selector: string) =>
				selector === '.cm-fold-indicator' ? indicator : null,
		};
		const element = Object.assign(new FakeElement(), {
			closest: (selector: string) => (selector === '.cm-line' ? line : null),
		});
		return { domAtPos: () => ({ node: element }) } as unknown as EditorView;
	};

	it('returns the fold arrow element of the line', () => {
		const indicator = {};
		expect(foldIndicatorOf(viewWithIndicator(indicator), 0)).toBe(indicator);
	});

	it('returns null when the line has no arrow', () => {
		expect(foldIndicatorOf(viewWithIndicator(null), 0)).toBeNull();
	});
});
