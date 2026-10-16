import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { bumpVersionFiles, type PluginManifest } from './lib/bump-version';
import { renderReleaseNotes } from './lib/release-notes';
import { isPrerelease } from './lib/semver';
import { findReleaseProblems } from './lib/verify-release';

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, value: object): void {
	writeFileSync(path, `${JSON.stringify(value, null, '\t')}\n`);
}

function git(args: string[]): string {
	return execFileSync('git', args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim();
}

function requireArgument(value: string | undefined, usage: string): string {
	if (value === undefined || value === '') {
		throw new Error(`Usage: ${usage}`);
	}
	return value;
}

function bump(): void {
	const version = requireArgument(
		process.env['npm_package_version'],
		'run through "npm version"',
	);
	const result = bumpVersionFiles({
		manifest: readJson<PluginManifest>('manifest.json'),
		versions: readJson<Record<string, string>>('versions.json'),
		version,
	});
	writeJson('manifest.json', result.manifest);
	writeJson('versions.json', result.versions);
}

function verify(tag: string): void {
	const problems = findReleaseProblems({
		tag,
		packageVersion: readJson<{ version: string }>('package.json').version,
		manifest: readJson<PluginManifest>('manifest.json'),
		versions: readJson<Record<string, string>>('versions.json'),
	});
	if (problems.length > 0) {
		throw new Error(problems.join('\n'));
	}
}

function printPrerelease(tag: string): void {
	process.stdout.write(`${isPrerelease(tag)}\n`);
}

function findPreviousTag(endRef: string): string | null {
	try {
		return git(['describe', '--tags', '--abbrev=0', `${endRef}^`]);
	} catch {
		return null;
	}
}

function notes(tag: string, repositoryUrl: string, endRef: string): void {
	const previousTag = findPreviousTag(endRef);
	const range = previousTag === null ? endRef : `${previousTag}..${endRef}`;
	const subjects = git(['log', '--format=%s', range]).split('\n');
	process.stdout.write(renderReleaseNotes({ tag, previousTag, repositoryUrl, subjects }));
}

const [command, firstArgument, secondArgument, thirdArgument] = process.argv.slice(2);

switch (command) {
	case 'bump':
		bump();
		break;
	case 'verify':
		verify(requireArgument(firstArgument, 'release.ts verify <tag>'));
		break;
	case 'prerelease':
		printPrerelease(requireArgument(firstArgument, 'release.ts prerelease <tag>'));
		break;
	case 'notes':
		notes(
			requireArgument(firstArgument, 'release.ts notes <tag> <repository-url> <end-ref>'),
			requireArgument(secondArgument, 'release.ts notes <tag> <repository-url> <end-ref>'),
			requireArgument(thirdArgument, 'release.ts notes <tag> <repository-url> <end-ref>'),
		);
		break;
	default:
		throw new Error('Usage: release.ts <bump|verify|prerelease|notes>');
}
