import type { IndentStyle } from '../../src/outline/indent-style';
import type { IndentStyle as GeneratorStyle } from './random-outline';

export const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

export const STYLES: { name: string; generator: GeneratorStyle; editor: IndentStyle }[] = [
	{
		name: 'tabs',
		generator: { tabs: true, unit: 4 },
		editor: { useTabs: true, unitColumns: 4, tabSize: 4 },
	},
	{
		name: '2 spaces',
		generator: { tabs: false, unit: 2 },
		editor: { useTabs: false, unitColumns: 2, tabSize: 4 },
	},
	{
		name: '4 spaces',
		generator: { tabs: false, unit: 4 },
		editor: { useTabs: false, unitColumns: 4, tabSize: 4 },
	},
];

export const MARKER_SETS: { name: string; markers: string[] }[] = [
	{ name: 'dash only', markers: ['-'] },
	{ name: 'all bullets', markers: ['-', '*', '+'] },
	{ name: 'ordered only', markers: ['1.'] },
	{ name: 'bullets and ordered', markers: ['-', '1.'] },
];
