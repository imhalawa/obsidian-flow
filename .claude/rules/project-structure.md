# Project structure and conventions

## Environment and tooling

- Node.js: use current LTS (Node 18+ recommended).
- Package manager: npm (`package.json` defines npm scripts and dependencies).
- Bundler: esbuild (`esbuild.config.mjs` and build scripts depend on it).
- Types: `obsidian` type definitions.
- Install: `npm install`. Dev (watch): `npm run dev`. Production build: `npm run build`.
- ESLint is preconfigured with `eslint-plugin-obsidianmd` for Obsidian-specific rules. Run `npm run lint`. A GitHub Action lints every commit on all branches.

## File and folder conventions

- Organize code into multiple files. Split functionality across separate modules rather than putting everything in `main.ts`.
- Source lives in `src/`. Keep `main.ts` small and focused on plugin lifecycle (loading, unloading, registering commands).
- Example structure:
    ```
    src/
      main.ts           # Plugin entry point, lifecycle management
      settings.ts       # Settings interface and defaults
      commands/         # Command implementations
        command1.ts
        command2.ts
      ui/              # UI components, modals, views
        modal.ts
        view.ts
      utils/           # Utility functions, helpers
        helpers.ts
        constants.ts
      types.ts         # TypeScript interfaces and types
    ```
- Do not commit build artifacts: never commit `node_modules/`, `main.js`, or other generated files.
- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages.
- Release artifacts must end up at the top level of the plugin folder in the vault (`main.js`, `manifest.json`, `styles.css`).

## Coding conventions

- TypeScript with `"strict": true`.
- Keep `main.ts` minimal: plugin lifecycle only (onload, onunload, addCommand calls). Delegate all feature logic to separate modules.
- Split large files: if a file exceeds ~200-300 lines, break it into smaller, focused modules.
- Use clear module boundaries: each file has a single, well-defined responsibility.
- Bundle everything into `main.js` (no unbundled runtime deps).
- Avoid Node/Electron APIs for mobile compatibility; set `isDesktopOnly` accordingly.
- Prefer `async/await` over promise chains; handle errors gracefully.
