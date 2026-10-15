import { Notice, type Editor, type Plugin } from 'obsidian';
import {
	canStep,
	isZoomed,
	stepHistory,
	zoomIn,
	zoomOut,
	zoomReset,
	zoomTargetOf,
	type ZoomOutcome,
	type ZoomTarget,
} from '../editor/zoom-control';
import { zoomOutcomeMessage } from '../ui/zoom-messages';

interface ZoomCommandDefinition {
	id: string;
	name: string;
	available: (target: ZoomTarget) => boolean;
	run: (target: ZoomTarget) => ZoomOutcome;
}

const DEFINITIONS: ZoomCommandDefinition[] = [
	{ id: 'zoom-in', name: 'Zoom in', available: () => true, run: zoomIn },
	{ id: 'zoom-out', name: 'Zoom out', available: isZoomed, run: zoomOut },
	{ id: 'zoom-reset', name: 'Show the whole note', available: isZoomed, run: zoomReset },
	{
		id: 'zoom-history-back',
		name: 'Zoom back',
		available: (target) => canStep(target, 'back'),
		run: (target) => stepHistory(target, 'back'),
	},
	{
		id: 'zoom-history-forward',
		name: 'Zoom forward',
		available: (target) => canStep(target, 'forward'),
		run: (target) => stepHistory(target, 'forward'),
	},
];

/** Registers the commands that zoom into items and step through the zoom history. */
export function registerZoomCommands(plugin: Plugin): void {
	for (const definition of DEFINITIONS) {
		plugin.addCommand({
			id: definition.id,
			name: definition.name,
			editorCheckCallback: (checking: boolean, editor: Editor) => {
				const target = zoomTargetOf(editor);
				if (!target) return false;
				if (checking) return definition.available(target);
				const message = zoomOutcomeMessage(definition.run(target));
				if (message) new Notice(message);
				return true;
			},
		});
	}
}
