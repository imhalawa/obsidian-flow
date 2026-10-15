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
			include: ['src/**/*.ts'],
			exclude: [
				'src/ui/breadcrumb-widget.ts',
				'src/editor/zoom-persistence.ts',
				'src/editor/block-id-hiding.ts',
				'src/editor/item-suggest.ts',
				'src/editor/item-pointer.ts',
				'src/editor/register-item-pointer.ts',
				'src/ui/item-menu.ts',
				'src/editor/register-mouse-history.ts',
			],
			reporter: ['text', 'lcov'],
			thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
		},
	},
});
