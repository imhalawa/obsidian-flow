import { isPlainVersion } from './semver';

export interface PluginManifest {
	version: string;
	minAppVersion: string;
	[field: string]: string | boolean;
}

export interface VersionFiles {
	manifest: PluginManifest;
	versions: Record<string, string>;
}

export interface BumpInput extends VersionFiles {
	version: string;
}

/** Returns the manifest and versions map for a new plugin version without changing the inputs. */
export function bumpVersionFiles(input: BumpInput): VersionFiles {
	if (!isPlainVersion(input.version)) {
		throw new Error(`Invalid version "${input.version}".`);
	}
	const manifest = { ...input.manifest, version: input.version };
	const versions = { ...input.versions };
	if (!(input.version in versions)) {
		versions[input.version] = input.manifest.minAppVersion;
	}
	return { manifest, versions };
}
