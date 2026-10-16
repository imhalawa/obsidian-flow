const PLAIN_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** Returns whether the text is a plain x.y.z version without a leading v. */
export function isPlainVersion(text: string): boolean {
	return PLAIN_VERSION.test(text);
}
