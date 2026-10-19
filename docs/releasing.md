# Releasing

A release is a tag. The tag workflow checks, builds and drafts a GitHub release. Publishing the draft stays a manual step.

## Cut a release

1. Make sure `master` is green and `minAppVersion` in `manifest.json` is the oldest Obsidian the code needs.
2. On a branch, run `npm version patch`, `npm version minor` or `npm version major`. The `version` script copies the new version into `manifest.json` and adds it to `versions.json`, and npm commits the change. The commit message is the bare version, so reword it to `chore(release): 1.2.3` before opening the pull request.
3. Merge the pull request into `master`.
4. Tag the merge commit with the version, without a leading `v`, and push the tag: `git tag 1.2.3 && git push origin 1.2.3`. If you cannot push tags, open **Actions → Release Obsidian plugin → Run workflow** on `master` instead. It reads the version from `manifest.json` and refuses if that tag already exists.
5. Open the draft release, read the notes and select **Publish release**. GitHub creates the tag on the release commit when a draft made by the manual run is published.

## Pre-releases

A version with a suffix, such as `0.1.0-beta.1` or `1.0.0-rc.1`, is a pre-release. Use it the same way as any other version: `npm version 0.1.0-beta.1` (or set the files by hand), merge, then run the workflow. The workflow accepts tags like `0.1.0-beta.1` and drafts the release marked **Pre-release**, so it never becomes the latest release.

Testers install a pre-release with [BRAT](https://github.com/TfTHacker/obsidian42-brat): **Add beta plugin** with the repository `imhalawa/obsidian-roamer`. BRAT needs a GitHub token in its settings while the repository is private.

The version in `versions.json` must be a full version with the same suffix. Pre-releases are not submitted to the community list; submit the stable version.

The first release, `0.1.0-beta.1`, is already set in the version files, so it needs only steps 4 and 5.

## What the tag workflow does

Defined in `.github/workflows/release.yml`. It runs for tags that look like `1.2.3` or `1.2.3-beta.1`, or by hand, and stops at the first failure:

1. Checks the tagged commit is on the default branch.
2. Checks the tag is a version like `1.2.3` or `1.2.3-beta.1` and equals the versions in `package.json` and `manifest.json` and that `versions.json` maps it to `minAppVersion` (`npm run release:verify`).
3. Runs `npm run check` and `npm run build`.
4. Checks `main.js`, `manifest.json` and `styles.css` exist and are not empty.
5. Attests the build provenance of `main.js` and `styles.css`. GitHub offers this only for public repositories, so the step is skipped while the repository is private.
6. Writes release notes from the Conventional Commits since the previous tag (`npm run release:notes`) and creates a draft release with the three files attached.

Release notes list `feat`, `fix`, `perf` and `revert` commits, and any commit marked breaking with `!`, each linked to its pull request. Other types are left out. A `BREAKING CHANGE:` footer is not read, so mark breaking commits with `!`.

## Check a release by hand

```bash
npm run --silent release:verify -- 1.2.3
npm run --silent release:notes -- 1.2.3 https://github.com/imhalawa/obsidian-roamer HEAD
```

The last argument is the commit the notes end at. Notes start after the latest tag reachable from it.

## Submit to the community list

Not done yet. Obsidian reviews a plugin once, after a pull request to [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) that adds an entry to `community-plugins.json`. It needs:

- A public repository with `README.md` and `LICENSE` at the root.
- A published (not draft) GitHub release whose tag equals the `manifest.json` version, with `main.js`, `manifest.json` and `styles.css` attached.
- An entry with `id`, `name`, `author`, `description` and `repo`. They must match the manifest and be sentence case. The id `roamer` can never change afterwards.
- A pass through the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) and [submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins). Reviewers read the code, so keep network calls, `innerHTML` and Node-only APIs out.

After approval, later versions need no new review. Users get them from new GitHub releases.
