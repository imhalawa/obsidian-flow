# Testing

- Tests stay readable: one behavior per test, names that state the behavior, `it.each` tables for input and output cases, no logic in tests.
- Test quality is the mutation score, not coverage alone. A surviving mutant means a missing test.
- Test pure modules directly with plain data. Keep adapters thin so they need few tests.
- Write the failing test first. Cover empty, single, nested and malformed inputs, and boundary values.
- Mock only the `obsidian` module boundary, in `tests/mocks/obsidian.ts`. Keep each stub minimal.
- Do not weaken a test to pass a mutant. Add the missing case.
- Never skip, disable or focus tests. Lint rejects it.
