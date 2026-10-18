import type { ToggleKey } from './settings';

export interface ToggleEntry {
	key: ToggleKey;
	name: string;
	description: string;
	refreshesEditors: boolean;
}

export interface SettingSection {
	heading: string | null;
	toggles: ToggleEntry[];
}

/** The toggles of the settings tab in display order, grouped under optional headings. */
export const SETTING_SECTIONS: SettingSection[] = [
	{
		heading: null,
		toggles: [
			{
				key: 'rememberZoom',
				name: 'Remember zoom per note',
				description: 'Reopen each note at the item you zoomed into.',
				refreshesEditors: false,
			},
			{
				key: 'cleanZoom',
				name: 'Show the zoomed item at the left edge',
				description:
					'Move the zoomed item to the left edge of the note and hide the indent guides of the levels above it.',
				refreshesEditors: true,
			},
			{
				key: 'fixedIndentSpacing',
				name: 'Use the same indent spacing in every theme',
				description:
					'Give every level of a list the same width, so guide lines, bullets and fold arrows keep the same gaps in any theme.',
				refreshesEditors: true,
			},
			{
				key: 'hideEmbedTitles',
				name: 'Hide embed titles in bullets',
				description:
					'Hide the title bar of a note embedded in a bullet, so the bullet lines up with the first line of the embed.',
				refreshesEditors: true,
			},
			{
				key: 'bulletCallouts',
				name: 'Show callout bullets as callouts',
				description:
					'Draw a bullet that starts with > [!tip] as a callout, with its bullet beside it. Put the cursor in it to edit the text.',
				refreshesEditors: true,
			},
		],
	},
	{
		heading: 'Bullets and thread lines',
		toggles: [
			{
				key: 'clickBulletToZoom',
				name: 'Click bullet to zoom',
				description: 'Select a bullet to zoom into that item.',
				refreshesEditors: false,
			},
			{
				key: 'clickThreadLineToFold',
				name: 'Click thread line to fold',
				description:
					'Select a thread line to fold its branch. Hold Alt to fold every descendant too.',
				refreshesEditors: false,
			},
			{
				key: 'useMouseHistory',
				name: 'Use mouse back and forward for zoom',
				description:
					"Step through zoom levels first. When none are left, Obsidian's own back and forward apply.",
				refreshesEditors: false,
			},
			{
				key: 'dragItems',
				name: 'Drag items by their bullet',
				description:
					'Press a bullet and move to drag the item and its children, also to another open note. A click on the bullet still zooms.',
				refreshesEditors: true,
			},
		],
	},
	{
		heading: 'List editing',
		toggles: [
			{
				key: 'enterOutdentsEmptyItem',
				name: 'Enter on an empty item outdents it',
				description: 'Outdent an empty item, or end the list when it is at the top level.',
				refreshesEditors: false,
			},
			{
				key: 'enterAddsFirstChild',
				name: 'Enter on an item with children adds its first child',
				description:
					'Add the new item as the first child, as a task when the first child is a task, instead of between the item and its children.',
				refreshesEditors: false,
			},
			{
				key: 'backspaceMergesItem',
				name: 'Backspace at the start of an item merges it',
				description: 'Join the item with the one above instead of deleting the bullet.',
				refreshesEditors: false,
			},
			{
				key: 'homeStaysInItem',
				name: 'Home stays inside the item text',
				description:
					'Move to the start of the item text before moving to the start of the line.',
				refreshesEditors: false,
			},
			{
				key: 'selectAllStaysInItem',
				name: 'Select all starts with the item text',
				description:
					'Select the text of the item first. Select all again to select the whole note.',
				refreshesEditors: false,
			},
			{
				key: 'tabIndentsItem',
				name: 'Tab and Shift-Tab move whole items',
				description:
					'Indent and outdent the item with its children. Turn this on to replace the editor keys.',
				refreshesEditors: false,
			},
			{
				key: 'keepBulletOutOfSelection',
				name: 'Keep the bullet out of text selections',
				description:
					'Treat the bullet as its own object: the cursor and selections stay in the text, and Backspace at the start of a text never eats the bullet.',
				refreshesEditors: true,
			},
		],
	},
];
