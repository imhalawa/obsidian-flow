const NUMBER = '(?:0|[1-9]\\d*)';
const PRERELEASE_PART = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)';
const SEMANTIC_VERSION = new RegExp(
	`^${NUMBER}\\.${NUMBER}\\.${NUMBER}(?:-${PRERELEASE_PART}(?:\\.${PRERELEASE_PART})*)?$`,
);

/** Returns whether the text is x.y.z with an optional pre-release suffix and no leading v. */
export function isSemanticVersion(text: string): boolean {
	return SEMANTIC_VERSION.test(text);
}

/** Returns whether a semantic version carries a pre-release suffix such as -beta.1. */
export function isPrerelease(version: string): boolean {
	return version.includes('-');
}
