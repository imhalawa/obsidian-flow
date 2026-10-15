import type { OutlineNode } from '../../src/outline/outline-tree';

/** Lists each node as `depth:text` in document order. */
export function outlineShape(roots: readonly OutlineNode[], depth: number): string[] {
	return roots.flatMap((node) => [
		`${depth}:${node.text}`,
		...outlineShape(node.children, depth + 1),
	]);
}
