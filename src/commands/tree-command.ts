import { Notice, type Editor, type Plugin } from 'obsidian';
import { hasTreeTarget, runTreeEdit } from '../editor/tree-edit';
import type { Operation } from '../outline/batch';
import { refusalMessage } from '../ui/refusal-messages';

export interface TreeCommandDefinition {
	id: string;
	name: string;
	operation: Operation;
	bottomUp: boolean;
}

/** Registers an editor command that runs an item operation on the selected items. */
export function registerTreeCommand(plugin: Plugin, definition: TreeCommandDefinition): void {
	plugin.addCommand({
		id: definition.id,
		name: definition.name,
		editorCheckCallback: (checking: boolean, editor: Editor) => {
			if (checking) return hasTreeTarget(editor);
			const outcome = runTreeEdit(editor, definition.operation, definition.bottomUp);
			if (!outcome.ok) new Notice(refusalMessage(outcome.reason));
			return true;
		},
	});
}
