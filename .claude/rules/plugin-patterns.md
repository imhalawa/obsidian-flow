# Plugin patterns, troubleshooting and references

## Commands and settings

- Add user-facing commands with `this.addCommand(...)`. Use stable command IDs; avoid renaming once released.
- If the plugin has configuration, provide a settings tab and sensible defaults.
- Persist settings with `this.loadData()` / `this.saveData()`.

## Examples

Minimal `main.ts` (lifecycle only):

```ts
import { Plugin } from 'obsidian';
import { MySettings, DEFAULT_SETTINGS } from './settings';
import { registerCommands } from './commands';

export default class MyPlugin extends Plugin {
	settings!: MySettings;

	async onload() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MySettings>,
		);
		registerCommands(this);
	}
}
```

`commands/index.ts`:

```ts
import { Plugin } from 'obsidian';
import { doSomething } from './my-command';

export function registerCommands(plugin: Plugin) {
	plugin.addCommand({
		id: 'do-something',
		name: 'Do something',
		callback: () => doSomething(plugin),
	});
}
```

Register listeners safely:

```ts
this.registerEvent(
	this.app.workspace.on('file-open', (f) => {
		/* ... */
	}),
);
this.registerDomEvent(activeWindow, 'resize', () => {
	/* ... */
});
this.registerInterval(
	window.setInterval(() => {
		/* ... */
	}, 1000),
);
```

These examples come from the Obsidian sample plugin. This project's own rules (no default parameter values, no comments in code) win over them.

## Troubleshooting

- Plugin does not load after build: ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`.
- Build issues: if `main.js` is missing, run `npm run build` or `npm run dev`.
- Commands not appearing: verify `addCommand` runs after `onload` and IDs are unique.
- Settings not persisting: ensure `loadData`/`saveData` are awaited and the UI is re-rendered after changes.
- Mobile-only issues: confirm no desktop-only APIs are used; check `isDesktopOnly` and adjust.

## References

- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
