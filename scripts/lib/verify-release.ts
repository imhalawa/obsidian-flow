import { isPlainVersion } from './semver';

export interface ReleaseState {
	tag: string;
	packageVersion: string;
	manifest: { version: string; minAppVersion: string };
	versions: Record<string, string>;
}

/** Returns a message for every way the tag and the version files disagree. */
export function findReleaseProblems(state: ReleaseState): string[] {
	const problems: string[] = [];
	const { tag, packageVersion, manifest, versions } = state;
	if (!isPlainVersion(tag)) {
		problems.push(`Tag "${tag}" is not a plain version like 1.2.3 without a leading v.`);
	}
	if (tag !== manifest.version) {
		problems.push(`Tag ${tag} does not match manifest.json version ${manifest.version}.`);
	}
	if (packageVersion !== manifest.version) {
		problems.push(
			`package.json version ${packageVersion} does not match manifest.json version ${manifest.version}.`,
		);
	}
	const mapped = versions[manifest.version];
	if (mapped === undefined) {
		problems.push(`versions.json has no entry for ${manifest.version}.`);
	} else if (mapped !== manifest.minAppVersion) {
		problems.push(
			`versions.json maps ${manifest.version} to ${mapped} but manifest.json minAppVersion is ${manifest.minAppVersion}.`,
		);
	}
	return problems;
}
