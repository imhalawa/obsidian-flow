import { EditorSelection, Prec } from '@codemirror/state';
import { EditorView, keymap, type KeyBinding } from '@codemirror/view';
import { Notice, type Plugin } from 'obsidian';
import { indentItem, outdentItem } from '../outline/indent';
import type { Operation } from '../outline/batch';
import { refusalMessage } from '../ui/refusal-messages';
import {
	backspaceInItem,
	enterInEmptyItem,
	enterInParentItem,
	homeInItem,
	selectItemText,
} from './list-keys';
import { hasTreeTarget, runTreeEdit } from './tree-edit';
import { zoomTargetOf } from './zoom-control';

export interface ListKeysHost {
	enterOutdentsEmptyItem: () => boolean;
	enterAddsFirstChild: () => boolean;
	backspaceMergesItem: () => boolean;
	homeStaysInItem: () => boolean;
	selectAllStaysInItem: () => boolean;
	tabIndentsItem: () => boolean;
}

/** Tells whether a position is on the first visual row of its line, so Home does not skip wrapped rows. */
function onFirstRow(view: EditorView, position: number): boolean {
	const row = view.moveToLineBoundary(EditorSelection.cursor(position), false);
	return row.head === view.state.doc.lineAt(position).from;
}

/** Adds the list editing keys to every editor; each key defers to Obsidian when it does not apply. */
export function registerListKeys(plugin: Plugin, host: ListKeysHost): void {
	const guarded = (
		isOn: () => boolean,
		run: (view: EditorView) => boolean,
	): ((view: EditorView) => boolean) => {
		return (view) => isOn() && !view.composing && run(view);
	};
	const tabKey = (operation: Operation): ((view: EditorView) => boolean) => {
		return guarded(host.tabIndentsItem, (view) => {
			const editor = plugin.app.workspace.activeEditor?.editor;
			if (!editor || zoomTargetOf(editor) !== view || !hasTreeTarget(editor)) return false;
			const outcome = runTreeEdit(editor, operation, false);
			if (!outcome.ok) new Notice(refusalMessage(outcome.reason));
			return true;
		});
	};
	const bindings: KeyBinding[] = [
		{
			key: 'Enter',
			run: (view) =>
				guarded(host.enterOutdentsEmptyItem, enterInEmptyItem)(view) ||
				guarded(host.enterAddsFirstChild, enterInParentItem)(view),
		},
		{ key: 'Backspace', run: guarded(host.backspaceMergesItem, backspaceInItem) },
		{
			key: 'Home',
			run: guarded(host.homeStaysInItem, (view) =>
				homeInItem(view, false, (position) => onFirstRow(view, position)),
			),
			shift: guarded(host.homeStaysInItem, (view) =>
				homeInItem(view, true, (position) => onFirstRow(view, position)),
			),
		},
		{ key: 'Mod-a', run: guarded(host.selectAllStaysInItem, selectItemText) },
		{ key: 'Tab', run: tabKey(indentItem), shift: tabKey(outdentItem) },
	];
	plugin.registerEditorExtension(Prec.high(keymap.of(bindings)));
}
