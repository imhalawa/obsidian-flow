import { describe, expect, it } from 'vitest';
import { isPrerelease, isSemanticVersion } from '../../scripts/lib/semver';

describe('isSemanticVersion', () => {
	it.each([
		'0.0.0',
		'1.2.3',
		'10.20.30',
		'0.1.0-beta.1',
		'1.0.0-rc.12',
		'2.0.0-alpha',
		'1.0.0-0',
	])('accepts "%s"', (text) => {
		expect(isSemanticVersion(text)).toBe(true);
	});

	it.each([
		'',
		'1',
		'1.2',
		'1.2.3.4',
		'v1.2.3',
		'01.2.3',
		'1.2.x',
		'1.2.3-',
		'1.2.3-.1',
		'1.2.3-beta..1',
		'1.2.3-01',
		'1.2.3-be ta',
		'1.2.3+build',
		' 1.2.3',
		'1.2.3\n',
	])('rejects "%s"', (text) => {
		expect(isSemanticVersion(text)).toBe(false);
	});
});

describe('isPrerelease', () => {
	it.each(['0.1.0-beta.1', '1.0.0-rc.1', '2.0.0-alpha'])('is true for "%s"', (text) => {
		expect(isPrerelease(text)).toBe(true);
	});

	it.each(['0.1.0', '10.20.30'])('is false for "%s"', (text) => {
		expect(isPrerelease(text)).toBe(false);
	});
});
