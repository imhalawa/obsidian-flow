import obsidianmd from 'eslint-plugin-obsidianmd';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'commitlint.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
		'coverage',
		'reports',
		'.stryker-tmp',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ['tests/**/*.ts'],
		plugins: { vitest },
		rules: {
			...vitest.configs.recommended.rules,
			'vitest/expect-expect': 'error',
			'vitest/no-identical-title': 'error',
			'vitest/no-focused-tests': 'error',
			'vitest/no-disabled-tests': 'error',
		},
	},
	{
		files: ['e2e/**/*.ts'],
		languageOptions: { globals: { ...globals.node } },
		rules: {
			'obsidianmd/no-nodejs-modules': 'off',
			'obsidianmd/prefer-window-timers': 'off',
			'obsidianmd/hardcoded-config-path': 'off',
			'no-restricted-globals': 'off',
		},
	},
	prettier,
);
