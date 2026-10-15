import {
	Notice,
	type Editor,
	type MarkdownFileInfo,
	type MarkdownView,
	type Plugin,
	type TFile,
} from 'obsidian';
import { ensureBlockId, type BlockLinkOutcome } from '../editor/block-link';
import { zoomTargetOf } from '../editor/zoom-control';
import { refusalMessage } from '../ui/refusal-messages';

export interface BlockLinkServices {
	random: () => number;
	copy: (text: string) => Promise<void>;
}

/** Returns the services the link commands use: real randomness and the system clipboard. */
export function systemBlockLinkServices(): BlockLinkServices {
	return {
		random: () => Math.random(),
		copy: (text) => activeWindow.navigator.clipboard.writeText(text),
	};
}

export const COPIED_MESSAGE = 'Copied link to item.';
export const COPY_FAILED_MESSAGE = 'Could not copy the link to the clipboard.';
export const DUPLICATE_ID_MESSAGE = 'This block id is used more than once in the note.';

/** Copies the link to an item whose id is known, and tells the user how it went. */
export function copyLinkToItem(
	plugin: Plugin,
	file: TFile,
	outcome: BlockLinkOutcome,
	services: BlockLinkServices,
): void {
	if (outcome.kind === 'not-a-list-item') {
		new Notice(refusalMessage('not-a-list-item'));
		return;
	}
	const link = plugin.app.fileManager.generateMarkdownLink(file, '', `#^${outcome.id}`);
	services.copy(link).then(
		() => new Notice(COPIED_MESSAGE),
		() => new Notice(COPY_FAILED_MESSAGE),
	);
	if (outcome.duplicate) new Notice(DUPLICATE_ID_MESSAGE);
}

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
			copyLinkToItem(plugin, file, ensureBlockId(target, services.random), services);
			return true;
		},
	});
}
