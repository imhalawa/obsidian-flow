import { describe, expect, it } from 'vitest';
import { findReleaseProblems } from '../../scripts/lib/verify-release';

const consistent = {
	tag: '0.2.0',
	packageVersion: '0.2.0',
	manifest: { version: '0.2.0', minAppVersion: '1.12.0' },
	versions: { '0.1.0': '1.12.0', '0.2.0': '1.12.0' },
};

describe('findReleaseProblems', () => {
	it('finds no problem when tag, package, manifest and versions agree', () => {
		expect(findReleaseProblems(consistent)).toEqual([]);
	});

	it.each(['v0.2.0', '0.2', '0.2.0-beta', 'latest'])(
		'reports the tag "%s" as not a plain version',
		(tag) => {
			expect(findReleaseProblems({ ...consistent, tag })).toContain(
				`Tag "${tag}" is not a plain version like 1.2.3 without a leading v.`,
			);
		},
	);

	it('reports a tag that differs from the manifest version', () => {
		const problems = findReleaseProblems({ ...consistent, tag: '0.3.0' });

		expect(problems).toContain('Tag 0.3.0 does not match manifest.json version 0.2.0.');
	});

	it('reports a package version that differs from the manifest version', () => {
		const problems = findReleaseProblems({ ...consistent, packageVersion: '0.1.0' });

		expect(problems).toContain(
			'package.json version 0.1.0 does not match manifest.json version 0.2.0.',
		);
	});

	it('reports a version missing from versions.json', () => {
		const problems = findReleaseProblems({ ...consistent, versions: { '0.1.0': '1.12.0' } });

		expect(problems).toContain('versions.json has no entry for 0.2.0.');
	});

	it('reports a versions.json entry that differs from the manifest minimum app version', () => {
		const problems = findReleaseProblems({
			...consistent,
			versions: { '0.2.0': '1.10.0' },
		});

		expect(problems).toContain(
			'versions.json maps 0.2.0 to 1.10.0 but manifest.json minAppVersion is 1.12.0.',
		);
	});

	it('reports every problem at once', () => {
		const problems = findReleaseProblems({
			tag: 'v9',
			packageVersion: '0.1.0',
			manifest: consistent.manifest,
			versions: {},
		});

		expect(problems).toHaveLength(4);
	});
});
