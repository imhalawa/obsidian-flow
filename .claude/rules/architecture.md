# Architecture

- `src/main.ts`: lifecycle only. Load settings, register commands, editor extensions and the settings tab.
- `src/settings.ts`: settings interface, defaults, settings tab.
- `src/outline/`: pure logic on text and plain data (list parsing, tree operations, move, indent, fold, zoom ranges). No `obsidian` or `@codemirror` imports. Fully unit tested.
- `src/editor/`: CodeMirror 6 adapters that turn editor state into pure inputs and apply pure results as transactions.
- `src/commands/`: one file per command, registered from one index.
- `src/ui/`: modals and views.
- Files stay under about 200 lines and have one responsibility.
- Pure modules take explicit inputs and return new values. Side effects live only in adapters.
