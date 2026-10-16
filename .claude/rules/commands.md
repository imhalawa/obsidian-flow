# Commands

- `npm run check`: typecheck, lint, format check, tests with coverage. Run before every commit.
- `npm run test`, `npm run test:watch`: unit tests.
- `npm run test:mutation`: Stryker. Score must stay at or above `thresholds.break` in `stryker.config.json`.
- `npm run build`: typecheck and production bundle. `npm run dev`: watch build.
- `npm run format`: Prettier write.
- `npm run commitlint -- --from <ref>`: check commit messages since a ref.
