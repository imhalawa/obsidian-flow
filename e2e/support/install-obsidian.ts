import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SNAP_INFO_URL =
	'https://api.snapcraft.io/v2/snaps/info/obsidian?fields=download,version,revision';

interface SnapInfo {
	'channel-map': { download: { 'sha3-384': string; url: string }; version: string }[];
}

/** Returns the directory that holds the downloaded Obsidian build. */
export function cacheDirectory(): string {
	return process.env['FLOW_E2E_CACHE'] ?? join(process.cwd(), '.e2e-cache');
}

/** Returns the path of the Obsidian binary, downloading and unpacking it on first use. */
export function ensureObsidian(): string {
	const cache = cacheDirectory();
	const binary = join(cache, 'app', 'app', 'obsidian');
	if (existsSync(binary)) return binary;
	mkdirSync(cache, { recursive: true });
	const info = JSON.parse(
		execFileSync('curl', ['-sSf', '-H', 'Snap-Device-Series: 16', SNAP_INFO_URL], {
			encoding: 'utf8',
		}),
	) as SnapInfo;
	const download = info['channel-map'][0]?.download;
	if (!download) throw new Error('The Snap store returned no Obsidian build.');
	const snap = join(cache, 'obsidian.snap');
	execFileSync('curl', ['-sSfL', '-o', snap, download.url]);
	const hash = createHash('sha3-384').update(readFileSync(snap)).digest('hex');
	if (hash !== download['sha3-384'])
		throw new Error('The Obsidian download failed its checksum.');
	execFileSync('unsquashfs', ['-q', '-d', join(cache, 'app'), snap]);
	return binary;
}
