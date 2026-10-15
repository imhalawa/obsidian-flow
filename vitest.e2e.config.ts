import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['e2e/**/*.e2e.ts'],
		fileParallelism: false,
		testTimeout: 60000,
		hookTimeout: 120000,
	},
});
