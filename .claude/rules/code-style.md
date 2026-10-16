# Code style

- Clear, readable code. Explicit over implicit: no default parameter values, no implicit conversions, no hidden coupling, no `any`.
- No comments in code. Function doc comments only, one brief definitive sentence (`/** Returns the nesting depth of an indent. */`).
- Never break the plugin: `npm run check` and `npm run build` pass before every push. CI enforces the same.
