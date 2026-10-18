import { describe, expect, it } from 'vitest';
import { bumpVersionFiles } from '../../scripts/lib/bump-version';

const manifest = { id: 'roamer', version: '0.1.0', minAppVersion: '1.12.0' };
const versions = { '0.1.0': '1.12.0' };

describe('bumpVersionFiles', () => {
	it('sets the manifest version', () => {
		const result = bumpVersionFiles({ manifest, versions, version: '0.2.0' });

		expect(result.manifest.version).toBe('0.2.0');
	});

	it('keeps the other manifest fields', () => {
		const result = bumpVersionFiles({ manifest, versions, version: '0.2.0' });

		expect(result.manifest.id).toBe('roamer');
		expect(result.manifest.minAppVersion).toBe('1.12.0');
	});

	it('maps the new version to the manifest minimum app version', () => {
		const result = bumpVersionFiles({
			manifest: { ...manifest, minAppVersion: '1.13.0' },
			versions,
			version: '0.2.0',
		});

		expect(result.versions).toEqual({ '0.1.0': '1.12.0', '0.2.0': '1.13.0' });
	});

	it('keeps the entry of a version that is already mapped', () => {
		const result = bumpVersionFiles({
			manifest: { ...manifest, minAppVersion: '1.13.0' },
			versions,
			version: '0.1.0',
		});

		expect(result.versions).toEqual({ '0.1.0': '1.12.0' });
	});

	it('does not change its inputs', () => {
		bumpVersionFiles({ manifest, versions, version: '0.2.0' });

		expect(manifest.version).toBe('0.1.0');
		expect(versions).toEqual({ '0.1.0': '1.12.0' });
	});

	it.each(['10.20.30', '0.0.0', '12.0.100', '0.1.0-beta.1', '1.0.0-rc.12', '2.0.0-alpha'])(
		'accepts the version "%s"',
		(version) => {
			expect(bumpVersionFiles({ manifest, versions, version }).manifest.version).toBe(
				version,
			);
		},
	);

	it.each([
		'',
		'1',
		'1.2',
		'1.2.3.4',
		'v1.2.3',
		'1.2.x',
		'01.2.3',
		'1.2.3-',
		'1.2.3-beta..1',
		'1.2.3-01',
		'1.2.3-be ta',
	])('rejects the version "%s"', (version) => {
		expect(() => bumpVersionFiles({ manifest, versions, version })).toThrow(
			`Invalid version "${version}".`,
		);
	});
});
