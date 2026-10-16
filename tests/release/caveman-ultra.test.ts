import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface HookEntry {
	command: string;
}

interface Settings {
	hooks: { SessionStart: { hooks: HookEntry[] }[] };
}

describe('caveman ultracave default', () => {
	it('pins the repo caveman default mode to ultracave', () => {
		const config = JSON.parse(readFileSync('.caveman.json', 'utf8')) as { defaultMode: string };

		expect(config.defaultMode).toBe('ultracave');
	});

	it('registers the ultracave hook at session start', () => {
		const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8')) as Settings;
		const commands = settings.hooks.SessionStart.flatMap((group) =>
			group.hooks.map((hook) => hook.command),
		);

		expect(commands).toContain('$CLAUDE_PROJECT_DIR/.claude/hooks/caveman-ultra.sh');
	});

	it('prints the ultracave instruction for subagents too', () => {
		const output = execFileSync('.claude/hooks/caveman-ultra.sh', { encoding: 'utf8' });

		expect(output).toContain('ULTRACAVE MODE ACTIVE');
		expect(output).toContain('subagent');
	});
});
