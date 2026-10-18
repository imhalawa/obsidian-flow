import { describe, expect, it } from 'vitest';
import { EMPTY_NOTE_LABEL, panelCrumbs } from '../../src/ui/panel-crumbs';

const summary = (noteName: string, path: { text: string; startLine: number }[]) =>
	panelCrumbs(noteName, path).map((crumb) => [crumb.label, crumb.targetLine, crumb.current]);

describe('panelCrumbs', () => {
	it('puts the note first and sends its click to the whole note', () => {
		expect(summary('Plan', [{ text: 'a', startLine: 1 }])).toEqual([
			['Plan', null, false],
			['a', 1, true],
		]);
	});

	it('draws one crumb per level after the note', () => {
		expect(
			summary('Plan', [
				{ text: 'a', startLine: 1 },
				{ text: 'b', startLine: 2 },
			]),
		).toEqual([
			['Plan', null, false],
			['a', 1, false],
			['b', 2, true],
		]);
	});

	it('names an empty note name', () => {
		expect(panelCrumbs('', [{ text: 'a', startLine: 1 }])[0]?.label).toBe(EMPTY_NOTE_LABEL);
	});

	it('names an empty item', () => {
		expect(panelCrumbs('Plan', [{ text: '', startLine: 4 }])[1]?.label).toBe('Empty item');
	});

	it('shows a level without its markdown markers and block id', () => {
		expect(panelCrumbs('Plan', [{ text: '**a** ^abc123', startLine: 1 }])[1]?.label).toBe('a');
	});

	it('draws only the note for an empty path', () => {
		expect(summary('Plan', [])).toEqual([['Plan', null, false]]);
	});
});
