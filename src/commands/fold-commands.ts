import { Notice, type Editor, type Plugin } from 'obsidian';
import { foldAll, foldItem, unfoldAll, unfoldItem, type FoldOutcome } from '../editor/fold-control';
import { zoomTargetOf, type ZoomTarget } from '../editor/zoom-control';
import { foldOutcomeMessage, type FoldAction } from '../ui/fold-messages';

interface FoldCommandDefinition {
	id: string;
	name: string;
	action: FoldAction;
	run: (target: ZoomTarget) => FoldOutcome;
}

const DEFINITIONS: FoldCommandDefinition[] = [
	{ id: 'fold-item', name: 'Fold item', action: 'fold', run: foldItem },
	{ id: 'unfold-item', name: 'Unfold item', action: 'unfold', run: unfoldItem },
	{ id: 'fold-all', name: 'Fold all items', action: 'fold', run: foldAll },
	{ id: 'unfold-all', name: 'Unfold all items', action: 'unfold', run: unfoldAll },
];

/** Registers the commands that fold and unfold items. */
export function registerFoldCommands(plugin: Plugin): void {
	for (const definition of DEFINITIONS) {
		plugin.addCommand({
			id: definition.id,
			name: definition.name,
			editorCheckCallback: (checking: boolean, editor: Editor) => {
				const target = zoomTargetOf(editor);
				if (!target) return false;
				if (checking) return true;
				const message = foldOutcomeMessage(definition.run(target), definition.action);
				if (message) new Notice(message);
				return true;
			},
		});
	}
}
