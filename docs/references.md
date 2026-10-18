# Obsidian references

Check these before guessing at API behavior.

## Plugin development

- [Developer docs](https://docs.obsidian.md)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Developer policies](https://docs.obsidian.md/Developer+policies)
- [Submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [Release checklist workflow](https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml)
- [Official sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [API typings](https://github.com/obsidianmd/obsidian-api): `node_modules/obsidian/obsidian.d.ts` is the source of truth for the installed version.
- [Obsidian CLI](https://help.obsidian.md/cli)
- [Style guide for UI copy](https://help.obsidian.md/style-guide)

## Editor internals

- [CodeMirror 6 reference](https://codemirror.net/docs/ref/)
- [CodeMirror 6 system guide](https://codemirror.net/docs/guide/)
- [Editor extensions in Obsidian](https://docs.obsidian.md/Plugins/Editor/Editor+extensions)

## Prior art for outliner behavior

- [Logseq](https://github.com/logseq/logseq)
- [obsidian-outliner](https://github.com/vslinko/obsidian-outliner): list indent, move, fold behavior on CodeMirror 6.
- [Roam Research](https://roamresearch.com/) and [RemNote](https://www.remnote.com/): block references, zoom, bullets as nodes.

## Obsidian internals

- [Obsidian internals Roamer depends on](obsidian-internals.md): undocumented APIs, DOM selectors and hacks, with the test that guards each.

## Testing

- [Vitest](https://vitest.dev)
- [Stryker mutation testing](https://stryker-mutator.io/docs/stryker-js/introduction/)
- [wdio-obsidian-service](https://github.com/jesse-r-s-hines/wdio-obsidian-service): end-to-end tests inside real Obsidian, including the latest release.

## Agent tooling

- [superpowers](https://github.com/obra/superpowers)
- [caveman](https://github.com/JuliusBrussee/caveman)
- [ponytail](https://github.com/DietrichGebert/ponytail)
- [obsidian-skills](https://github.com/kepano/obsidian-skills)
