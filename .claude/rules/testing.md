# Testing

- Tests stay readable: one behavior per test, names that state the behavior, `it.each` tables for input and output cases, no logic in tests.
- Test quality is the mutation score, not coverage alone. A surviving mutant means a missing test.
- Test pure modules directly with plain data. Keep adapters thin so they need few tests.
- Write the failing test first. Cover empty, single, nested and malformed inputs, and boundary values.
- Mock only the `obsidian` module boundary, in `tests/mocks/obsidian.ts`. Keep each stub minimal.
- Do not weaken a test to pass a mutant. Add the missing case.
- Never skip, disable or focus tests. Lint rejects it.

## Efficient local runs

- Locally, run only what the change affects: the unit tests of the touched modules (`npx vitest run <paths>`) and the one or two e2e specs of the touched feature. CI runs the full e2e suite.
- `npm run check` stays the gate before every commit. It is fast and covers every unit test. Do not run the full e2e suite locally unless a change is cross-cutting and a targeted run cannot show it.
- Run e2e headless in WSL2 and never two runs at once, because they share one Obsidian instance.
- Start each change from a clean, current branch off the latest `master`. Then a targeted local run is enough, because CI runs everything else.
