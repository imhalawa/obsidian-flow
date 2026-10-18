import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { zoomChange, zoomField } from '../../src/editor/zoom-field';
import RoamerPlugin from '../../src/main';
import { FakeApp } from '../support/fake-app';

const NOTE = ['# One', '## Two', '- a', '- b', '- c'].join('\n');

const loadedExtensions = async (): Promise<Extension[]> => {
	const plugin = new RoamerPlugin(new FakeApp() as never, {} as never);
	await plugin.onload();
	return (plugin as unknown as { editorExtensions: Extension[] }).editorExtensions;
};

const openEditorState = (): { state: EditorState; slot: Compartment } => {
	const slot = new Compartment();
	return { state: EditorState.create({ doc: NOTE, extensions: [slot.of([])] }), slot };
};

describe('enabling the plugin while a note is already open', () => {
	it('adds the extensions to the open editor without throwing', async () => {
		const { state, slot } = openEditorState();
		const extensions = await loadedExtensions();
		expect(() => state.update({ effects: slot.reconfigure(extensions) })).not.toThrow();
	});

	it('lets every update listener see the change that adds the extensions', async () => {
		const { state, slot } = openEditorState();
		const extensions = await loadedExtensions();
		const transaction = state.update({ effects: slot.reconfigure(extensions) });
		const update = {
			startState: state,
			state: transaction.state,
			transactions: [transaction],
		} as unknown as ViewUpdate;
		const listeners = transaction.state.facet(EditorView.updateListener);
		expect(() => listeners.forEach((listener) => listener(update))).not.toThrow();
	});

	it('starts the new editor extensions without a zoom', async () => {
		const { state, slot } = openEditorState();
		const extensions = await loadedExtensions();
		const enabled = state.update({ effects: slot.reconfigure(extensions) }).state;
		expect(enabled.field(zoomField)).toBeNull();
	});

	it('keeps accepting typed text after the extensions arrive', async () => {
		const { state, slot } = openEditorState();
		const extensions = await loadedExtensions();
		const enabled = state.update({ effects: slot.reconfigure(extensions) }).state;
		const typed = enabled.update({
			changes: { from: NOTE.length, insert: 'x' },
			userEvent: 'input.type',
		}).state;
		expect(typed.doc.toString()).toBe(`${NOTE}x`);
	});

	it('zooms after the extensions arrive', async () => {
		const { state, slot } = openEditorState();
		const extensions = await loadedExtensions();
		const enabled = state.update({ effects: slot.reconfigure(extensions) }).state;
		const zoomed = enabled.update({
			effects: zoomChange.of({ startLine: 1, navigation: 'visit' }),
		}).state;
		expect(zoomed.field(zoomField)).not.toBeNull();
	});

	it('removes the extensions from the open editor without throwing', async () => {
		const { state, slot } = openEditorState();
		const extensions = await loadedExtensions();
		const enabled = state.update({ effects: slot.reconfigure(extensions) }).state;
		expect(() => enabled.update({ effects: slot.reconfigure([]) })).not.toThrow();
	});
});
