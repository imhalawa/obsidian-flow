# Tech stack

- TypeScript with `strict`, `noUncheckedIndexedAccess`. Bundled by esbuild to `main.js`. Entry `src/main.ts`.
- Editor behavior is built as CodeMirror 6 extensions (`@codemirror/*` and `@lezer/*` come from Obsidian, never bundle them).
- Vitest for tests, `tests/mocks/obsidian.ts` stands in for the types-only `obsidian` package.
- ESLint (`eslint-plugin-obsidianmd`, `@vitest/eslint-plugin`), Prettier, Stryker mutation testing.
- npm only. Node 22.12 or newer. Vitest stays on `~4.0` until npm and Stryker support newer versions.
