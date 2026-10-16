import type { KeyName } from './obsidian-app';

export type SpecStep =
	| { kind: 'apply'; state: string }
	| { kind: 'key'; shortcut: string }
	| { kind: 'execute'; command: string }
	| { kind: 'assert'; state: string };

export interface BehaviourSpec {
	title: string;
	platform: string | null;
	settings: string[];
	steps: SpecStep[];
}

export interface KeyPress {
	name: KeyName;
	shift: boolean;
	control: boolean;
}

const KEY_NAMES: Record<string, KeyName> = {
	Enter: 'enter',
	Backspace: 'backspace',
	Home: 'home',
	Tab: 'tab',
	KeyA: 'a',
	Escape: 'escape',
};

const FIELD = /^- (applyState|assertState|keydown|execute|platform|setting):\s*(?:`(.*)`)?\s*$/;

/** Reads a fenced block that starts at the given line and returns its text and the line after it. */
function readBlock(lines: readonly string[], start: number): { text: string; next: number } {
	let line = start;
	while (line < lines.length && !(lines[line] ?? '').startsWith('```')) line += 1;
	const body: string[] = [];
	line += 1;
	while (line < lines.length && !(lines[line] ?? '').startsWith('```')) {
		body.push(lines[line] ?? '');
		line += 1;
	}
	return { text: body.join('\n'), next: line + 1 };
}

/** Parses a Markdown file of behaviour specs: a title line, then steps written as bullet fields and fenced states. */
export function parseSpecs(source: string): BehaviourSpec[] {
	const lines = source.split('\n');
	const specs: BehaviourSpec[] = [];
	let current: BehaviourSpec | null = null;
	let line = 0;
	while (line < lines.length) {
		const text = lines[line] ?? '';
		if (text.startsWith('# ')) {
			current = { title: text.slice(2).trim(), platform: null, settings: [], steps: [] };
			specs.push(current);
			line += 1;
			continue;
		}
		const field = FIELD.exec(text);
		if (!current || !field) {
			line += 1;
			continue;
		}
		const [, name, value] = field;
		if (name === 'applyState' || name === 'assertState') {
			const block = readBlock(lines, line + 1);
			current.steps.push({
				kind: name === 'applyState' ? 'apply' : 'assert',
				state: block.text,
			});
			line = block.next;
			continue;
		}
		if (name === 'keydown') current.steps.push({ kind: 'key', shortcut: value ?? '' });
		if (name === 'execute') current.steps.push({ kind: 'execute', command: value ?? '' });
		if (name === 'platform') current.platform = value ?? null;
		if (name === 'setting') current.settings.push(value ?? '');
		line += 1;
	}
	return specs;
}

/** Turns a shortcut such as Shift-Tab or Ctrl-KeyA into the key press that produces it, or null when it is not supported. */
export function toKeyPress(shortcut: string): KeyPress | null {
	const parts = shortcut.split('-');
	const key = parts[parts.length - 1] ?? '';
	const name = KEY_NAMES[key];
	if (!name) return null;
	const modifiers = parts.slice(0, -1);
	if (modifiers.some((modifier) => !['Shift', 'Ctrl', 'Mod'].includes(modifier))) return null;
	return {
		name,
		shift: modifiers.includes('Shift'),
		control: modifiers.includes('Ctrl') || modifiers.includes('Mod'),
	};
}
