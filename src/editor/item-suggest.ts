import {
	EditorSuggest,
	MarkdownView,
	Notice,
	type App,
	type Editor,
	type EditorChange,
	type EditorPosition,
	type EditorSuggestContext,
	type EditorSuggestTriggerInfo,
	type TFile,
} from 'obsidian';
import { planBlockId, withBlockId } from '../outline/block-id-plan';
import {
	closingParensAfter,
	itemTrigger,
	locateItem,
	searchItems,
	type IndexedItem,
} from '../outline/item-search';
import { ItemIndex, type IndexSource } from './item-index';

export interface ItemSuggestServices {
	isEnabled: () => boolean;
	random: () => number;
}

export const ITEM_GONE_MESSAGE = 'Could not find that item. It may have moved or been removed.';
const SUGGESTION_LIMIT = 30;
const INDEX_TAB_SIZE = 4;

/** Returns the editors that show a note, which hold its text before it is saved. */
function openEditors(app: App): MarkdownView[] {
	return app.workspace
		.getLeavesOfType('markdown')
		.map((leaf) => leaf.view)
		.filter((view): view is MarkdownView => view instanceof MarkdownView);
}

/** Lists the notes that have list items or are open, newest first, and reads open notes from their editor and the others through the vault cache. */
function vaultSource(app: App): IndexSource {
	return {
		files: () => {
			const open = new Set(
				openEditors(app).flatMap((view) => (view.file ? [view.file.path] : [])),
			);
			return app.vault
				.getMarkdownFiles()
				.filter(
					(file) =>
						open.has(file.path) ||
						(app.metadataCache.getFileCache(file)?.listItems?.length ?? 0) > 0,
				)
				.sort((left, right) => right.stat.mtime - left.stat.mtime)
				.map((file) => ({
					path: file.path,
					mtime: file.stat.mtime,
					live: open.has(file.path),
				}));
		},
		read: async (path) => {
			const editor = openEditors(app).find((view) => view.file?.path === path);
			if (editor) return editor.editor.getValue();
			const file = app.vault.getFileByPath(path);
			if (!file) throw new Error(`No note at ${path}`);
			return app.vault.cachedRead(file);
		},
		tabSize: () => INDEX_TAB_SIZE,
	};
}

/** Suggests list items from the vault after `((` and inserts a link to the chosen item. */
export class ItemSuggest extends EditorSuggest<IndexedItem> {
	private readonly index: ItemIndex;

	constructor(
		app: App,
		private readonly services: ItemSuggestServices,
	) {
		super(app);
		this.index = new ItemIndex(vaultSource(app));
	}

	onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
		if (!this.services.isEnabled()) return null;
		const trigger = itemTrigger(editor.getLine(cursor.line).slice(0, cursor.ch));
		if (!trigger) return null;
		return {
			start: { line: cursor.line, ch: trigger.start },
			end: cursor,
			query: trigger.query,
		};
	}

	async getSuggestions(context: EditorSuggestContext): Promise<IndexedItem[]> {
		return searchItems(await this.index.items(), context.query, SUGGESTION_LIMIT);
	}

	renderSuggestion(item: IndexedItem, element: HTMLElement): void {
		element.createDiv({ cls: 'flow-item-suggest-text', text: item.text });
		element.createDiv({ cls: 'flow-item-suggest-path', text: item.path });
	}

	selectSuggestion(item: IndexedItem): void {
		const context = this.context;
		if (!context?.file) return;
		this.link(item, context, context.file).catch(() => new Notice(ITEM_GONE_MESSAGE));
	}

	private async link(
		item: IndexedItem,
		context: EditorSuggestContext,
		source: TFile,
	): Promise<void> {
		const target = this.app.vault.getFileByPath(item.path);
		if (!target) throw new Error(`No note at ${item.path}`);
		const rest = context.editor.getLine(context.end.line).slice(context.end.ch);
		const replaced = {
			from: context.start,
			to: { line: context.end.line, ch: context.end.ch + closingParensAfter(rest) },
		};
		const makeLink = (id: string) =>
			this.app.fileManager.generateMarkdownLink(target, source.path, `#^${id}`);
		if (target.path === source.path) {
			this.linkInSameNote(item, context.editor, replaced, makeLink);
			return;
		}
		let id: string | null = null;
		await this.app.vault.process(target, (text) => {
			const line = locateItem(text, INDEX_TAB_SIZE, item);
			const result =
				line === null
					? null
					: withBlockId(text, INDEX_TAB_SIZE, line, item.text, this.services.random);
			id = result?.id ?? null;
			return result?.text ?? text;
		});
		if (id === null) throw new Error('The item is gone');
		context.editor.replaceRange(makeLink(id), replaced.from, replaced.to);
	}

	private linkInSameNote(
		item: IndexedItem,
		editor: Editor,
		replaced: { from: EditorPosition; to: EditorPosition },
		makeLink: (id: string) => string,
	): void {
		const text = editor.getValue();
		const line = locateItem(text, INDEX_TAB_SIZE, item);
		if (line === null) throw new Error('The item is gone');
		const plan = planBlockId(
			text.split('\n'),
			INDEX_TAB_SIZE,
			line,
			item.text,
			this.services.random,
		);
		if (!plan) throw new Error('The item is gone');
		const changes: EditorChange[] = [{ ...replaced, text: makeLink(plan.id) }];
		if (plan.insertion) {
			const { lineIndex, from, to, insert } = plan.insertion;
			changes.push({
				from: { line: lineIndex, ch: from },
				to: { line: lineIndex, ch: to },
				text: insert,
			});
		}
		editor.transaction({ changes });
	}
}
