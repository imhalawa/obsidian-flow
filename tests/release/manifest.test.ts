import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isSemanticVersion } from '../../scripts/lib/semver';

interface Manifest {
	id: string;
	name: string;
	version: string;
	minAppVersion: string;
	description: string;
	author: string;
	isDesktopOnly: boolean;
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const manifest = readJson<Manifest>('manifest.json');
const versions = readJson<Record<string, string>>('versions.json');
const pkg = readJson<{ version: string }>('package.json');

describe('manifest.json', () => {
	it('has an id without "obsidian" that does not end in "plugin"', () => {
		expect(manifest.id).toMatch(/^[a-z0-9-]+$/);
		expect(manifest.id).not.toContain('obsidian');
		expect(manifest.id.endsWith('plugin')).toBe(false);
	});

	it('has a name without "Obsidian" or "plugin"', () => {
		expect(manifest.name.toLowerCase()).not.toContain('obsidian');
		expect(manifest.name.toLowerCase()).not.toContain('plugin');
	});

	it('has a description under 250 characters', () => {
		expect(manifest.description.length).toBeLessThan(250);
	});

	it('has a description that starts with a capital letter and ends with a period', () => {
		expect(manifest.description).toMatch(/^[A-Z].*\.$/);
	});

	it('has a description without emoji', () => {
		expect(manifest.description).not.toMatch(/\p{Extended_Pictographic}/u);
	});

	it('has a semantic version and a minimum app version', () => {
		expect(isSemanticVersion(manifest.version)).toBe(true);
		expect(manifest.minAppVersion).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it('names an author', () => {
		expect(manifest.author.length).toBeGreaterThan(0);
	});
});

describe('release files', () => {
	it('keeps package.json and manifest.json on the same version', () => {
		expect(pkg.version).toBe(manifest.version);
	});

	it('maps the manifest version to its minimum app version in versions.json', () => {
		expect(versions[manifest.version]).toBe(manifest.minAppVersion);
	});
});
