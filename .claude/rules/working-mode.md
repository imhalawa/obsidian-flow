# Working mode

- Caveman `ultracave` is on for every thread, subagent and tool session (`.caveman.json`). Terse chat only.
- Commits, PR text, docs, code and tests are written in normal clear English, never caveman.
- Every commit follows Conventional Commits: `type(scope): subject`, imperative, lowercase, no trailing period. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Breaking changes use `!` or a `BREAKING CHANGE:` footer. One logical change per commit. PR titles follow the same format. `commitlint` enforces it locally (husky `commit-msg` hook) and in CI.
- PR descriptions are short: a few lines on what changed, plus screenshots for UI changes. No "written by Claude" ending, no session URLs. The repo will be public.
- Commits carry no Claude attribution: no `Co-Authored-By`, no session links (`includeCoAuthoredBy: false`).
- Use superpowers: brainstorm, write a plan, red/green TDD, review, for every feature and bug fix.
- Use ponytail: smallest working change. Do not skip validation, error handling, accessibility or tests.
