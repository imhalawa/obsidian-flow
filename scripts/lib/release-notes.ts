export interface ParsedCommit {
	type: string;
	scope: string | null;
	breaking: boolean;
	text: string;
	pullNumber: number | null;
}

export interface ReleaseNotesInput {
	tag: string;
	previousTag: string | null;
	repositoryUrl: string;
	subjects: string[];
}

const SUBJECT = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<rest>.+)$/;
const PULL_SUFFIX = / \(#(\d+)\)$/;

const SECTIONS: { title: string; types: string[] }[] = [
	{ title: 'Features', types: ['feat'] },
	{ title: 'Fixes', types: ['fix'] },
	{ title: 'Performance', types: ['perf'] },
	{ title: 'Reverts', types: ['revert'] },
];

/** Parses a Conventional Commits subject, or returns null when it does not follow the format. */
export function parseCommitSubject(subject: string): ParsedCommit | null {
	const groups = SUBJECT.exec(subject)?.groups;
	if (groups === undefined) {
		return null;
	}
	const rest = groups['rest'] ?? '';
	const pull = PULL_SUFFIX.exec(rest);
	return {
		type: groups['type'] ?? '',
		scope: groups['scope'] ?? null,
		breaking: groups['bang'] === '!',
		text: pull === null ? rest : rest.slice(0, pull.index),
		pullNumber: pull === null ? null : Number(pull[1]),
	};
}

function renderLine(commit: ParsedCommit, repositoryUrl: string): string {
	const scope = commit.scope === null ? '' : `**${commit.scope}:** `;
	const pull =
		commit.pullNumber === null
			? ''
			: ` ([#${commit.pullNumber}](${repositoryUrl}/pull/${commit.pullNumber}))`;
	return `- ${scope}${commit.text}${pull}`;
}

function renderSection(title: string, commits: ParsedCommit[], repositoryUrl: string): string[] {
	if (commits.length === 0) {
		return [];
	}
	return [`## ${title}`, '', ...commits.map((commit) => renderLine(commit, repositoryUrl)), ''];
}

/** Returns Markdown release notes built from the Conventional Commits subjects of a release. */
export function renderReleaseNotes(input: ReleaseNotesInput): string {
	const commits = input.subjects
		.map(parseCommitSubject)
		.filter((commit): commit is ParsedCommit => commit !== null);
	const breaking = commits.filter((commit) => commit.breaking);
	const sections = [
		...renderSection('Breaking changes', breaking, input.repositoryUrl),
		...SECTIONS.flatMap((section) =>
			renderSection(
				section.title,
				commits.filter((commit) => !commit.breaking && section.types.includes(commit.type)),
				input.repositoryUrl,
			),
		),
	];
	const changelogUrl =
		input.previousTag === null
			? `${input.repositoryUrl}/commits/${input.tag}`
			: `${input.repositoryUrl}/compare/${input.previousTag}...${input.tag}`;
	const body = sections.length === 0 ? ['No user-facing changes.', ''] : sections;
	return [...body, `**Full changelog**: ${changelogUrl}`, ''].join('\n');
}
