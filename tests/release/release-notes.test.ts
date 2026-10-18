import { describe, expect, it } from 'vitest';
import { parseCommitSubject, renderReleaseNotes } from '../../scripts/lib/release-notes';

const repositoryUrl = 'https://github.com/imhalawa/obsidian-roamer';

describe('parseCommitSubject', () => {
	it.each([
		[
			'feat: add zoom',
			{ type: 'feat', scope: null, breaking: false, text: 'add zoom', pullNumber: null },
		],
		[
			'fix(editor): keep folds (#12)',
			{ type: 'fix', scope: 'editor', breaking: false, text: 'keep folds', pullNumber: 12 },
		],
		[
			'feat(api)!: drop old settings',
			{
				type: 'feat',
				scope: 'api',
				breaking: true,
				text: 'drop old settings',
				pullNumber: null,
			},
		],
		[
			'chore!: raise minimum version (#3)',
			{
				type: 'chore',
				scope: null,
				breaking: true,
				text: 'raise minimum version',
				pullNumber: 3,
			},
		],
	])('parses "%s"', (subject, expected) => {
		expect(parseCommitSubject(subject)).toEqual(expected);
	});

	it('keeps a pull request mention that is not at the end of the subject', () => {
		expect(parseCommitSubject('fix: handle (#3) in text')).toEqual({
			type: 'fix',
			scope: null,
			breaking: false,
			text: 'handle (#3) in text',
			pullNumber: null,
		});
	});

	it.each([
		'Initial commit',
		'feat: first\nsecond',
		'feat add zoom',
		'Feat: add zoom',
		'feat:add zoom',
		'feat: ',
		'',
	])('returns null for "%s"', (subject) => {
		expect(parseCommitSubject(subject)).toBeNull();
	});
});

describe('renderReleaseNotes', () => {
	it('lists features and fixes under their own headings', () => {
		const notes = renderReleaseNotes({
			tag: '0.2.0',
			previousTag: '0.1.0',
			repositoryUrl,
			subjects: ['feat(editor): add zoom (#4)', 'fix(editor): keep folds (#5)'],
		});

		expect(notes).toBe(
			[
				'## Features',
				'',
				`- **editor:** add zoom ([#4](${repositoryUrl}/pull/4))`,
				'',
				'## Fixes',
				'',
				`- **editor:** keep folds ([#5](${repositoryUrl}/pull/5))`,
				'',
				`**Full changelog**: ${repositoryUrl}/compare/0.1.0...0.2.0`,
				'',
			].join('\n'),
		);
	});

	it('orders the headings breaking changes, features, fixes, performance, reverts', () => {
		const notes = renderReleaseNotes({
			tag: '1.0.0',
			previousTag: '0.9.0',
			repositoryUrl,
			subjects: [
				'revert: undo drag',
				'perf: faster parse',
				'fix: typo',
				'feat: new thing',
				'refactor!: rename settings',
			],
		});

		const headings = notes.split('\n').filter((line) => line.startsWith('## '));

		expect(headings).toEqual([
			'## Breaking changes',
			'## Features',
			'## Fixes',
			'## Performance',
			'## Reverts',
		]);
	});

	it('lists a breaking commit under breaking changes only', () => {
		const notes = renderReleaseNotes({
			tag: '1.0.0',
			previousTag: '0.9.0',
			repositoryUrl,
			subjects: ['feat!: new settings format'],
		});

		expect(notes).toContain('## Breaking changes\n\n- new settings format\n');
		expect(notes).not.toContain('## Features');
	});

	it('keeps the order of the commits within a heading', () => {
		const notes = renderReleaseNotes({
			tag: '0.2.0',
			previousTag: '0.1.0',
			repositoryUrl,
			subjects: ['feat: second', 'feat: first'],
		});

		expect(notes.indexOf('- second')).toBeLessThan(notes.indexOf('- first'));
	});

	it.each([
		'docs: update readme',
		'test: add case',
		'chore: bump',
		'ci: tune',
		'style: format',
		'build: bundle',
		'refactor: split',
	])('leaves out "%s"', (subject) => {
		const notes = renderReleaseNotes({
			tag: '0.2.0',
			previousTag: '0.1.0',
			repositoryUrl,
			subjects: [subject, 'feat: add zoom'],
		});

		expect(notes).not.toContain(subject.split(': ')[1]);
	});

	it('leaves out commits that are not conventional', () => {
		const notes = renderReleaseNotes({
			tag: '0.1.0',
			previousTag: null,
			repositoryUrl,
			subjects: ['Initial commit', 'feat: add zoom'],
		});

		expect(notes).not.toContain('Initial commit');
	});

	it('writes a line without a link when the commit has no pull request', () => {
		const notes = renderReleaseNotes({
			tag: '0.2.0',
			previousTag: '0.1.0',
			repositoryUrl,
			subjects: ['feat: add zoom'],
		});

		expect(notes).toContain('- add zoom\n');
	});

	it('links to the tag commits when there is no previous tag', () => {
		const notes = renderReleaseNotes({
			tag: '0.1.0',
			previousTag: null,
			repositoryUrl,
			subjects: ['feat: add zoom'],
		});

		expect(notes).toContain(`**Full changelog**: ${repositoryUrl}/commits/0.1.0`);
	});

	it('says so when nothing is user facing', () => {
		const notes = renderReleaseNotes({
			tag: '0.1.1',
			previousTag: '0.1.0',
			repositoryUrl,
			subjects: ['chore: bump', 'docs: readme'],
		});

		expect(notes).toBe(
			`No user-facing changes.\n\n**Full changelog**: ${repositoryUrl}/compare/0.1.0...0.1.1\n`,
		);
	});
});
