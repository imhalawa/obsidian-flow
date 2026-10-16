import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			obsidian: `${import.meta.dirname}/tests/mocks/obsidian.ts`,
		},
	},
	test: {
		include: ['tests/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts', 'scripts/lib/**/*.ts'],
			exclude: [
				'src/ui/header-path.ts',
				'src/editor/zoom-header.ts',
				'src/editor/clean-zoom.ts',
				'src/editor/zoom-persistence.ts',
				'src/editor/block-id-hiding.ts',
				'src/editor/item-suggest.ts',
				'src/editor/item-pointer.ts',
				'src/editor/register-item-pointer.ts',
				'src/ui/item-menu.ts',
				'src/editor/register-mouse-history.ts',
				'src/editor/register-list-keys.ts',
				'src/editor/drag-hover.ts',
				'src/editor/item-drag.ts',
				'src/editor/register-item-drag.ts',
				'src/editor/drop-indicator.ts',
				'src/editor/item-geometry.ts',
			],
			reporter: ['text', 'lcov'],
			thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
		},
	},
});
