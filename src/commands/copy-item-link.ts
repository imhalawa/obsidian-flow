import {
	Notice,
	type Editor,
	type MarkdownFileInfo,
	type MarkdownView,
	type Plugin,
} from 'obsidian';
import { ensureBlockId } from '../editor/block-link';
import { zoomTargetOf } from '../editor/zoom-control';
import { refusalMessage } from '../ui/refusal-messages';

export interface BlockLinkServices {
	random: () => number;
	copy: (text: string) => Promise<void>;
}

export const COPIED_MESSAGE = 'Copied link to item.';
export const COPY_FAILED_MESSAGE = 'Could not copy the link to the clipboard.';
export const DUPLICATE_ID_MESSAGE = 'This block id is used more than once in the note.';

/** Registers the command that links to the item at the cursor, adding a block id when needed. */
export function registerCopyItemLink(plugin: Plugin, services: BlockLinkServices): void {
	plugin.addCommand({
		id: 'copy-item-link',
		name: 'Copy link to item',
		editorCheckCallback: (
			checking: boolean,
			editor: Editor,
			context: MarkdownView | MarkdownFileInfo,
		) => {
			const target = zoomTargetOf(editor);
			const file = context.file;
			if (!target || !file) return false;
			if (checking) return true;
			const outcome = ensureBlockId(target, services.random);
			if (outcome.kind === 'not-a-list-item') {
				new Notice(refusalMessage('not-a-list-item'));
				return true;
			}
			const link = plugin.app.fileManager.generateMarkdownLink(file, '', `#^${outcome.id}`);
			services.copy(link).then(
				() => new Notice(COPIED_MESSAGE),
				() => new Notice(COPY_FAILED_MESSAGE),
			);
			if (outcome.duplicate) new Notice(DUPLICATE_ID_MESSAGE);
			return true;
		},
	});
}
