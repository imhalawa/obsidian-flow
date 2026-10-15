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
			exclude: ['src/ui/breadcrumb-widget.ts', 'src/editor/zoom-persistence.ts'],
			reporter: ['text', 'lcov'],
			thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
		},
	},
});
