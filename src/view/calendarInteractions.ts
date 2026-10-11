import type { App } from "obsidian";
import type { CalendarItem, DropCommitFn, PluginSettings } from "../types";
import type { EventNotes } from "../EventNotes";
import { CreateEventModal } from "../CreateEventModal";
import { eventNoteConfig, isEventNotePath } from "../utils/eventNotePath";

export interface CalendarInteractionDeps {
	app: App;
	eventNotes: EventNotes;
	/** Read at call time — settings are mutable. */
	getSettings: () => PluginSettings;
	/** Called after a reminder promotion lands, so the host can repaint with the new note. */
	rerender: () => void;
}

export interface CalendarInteractions {
	onDropCommit: DropCommitFn;
	onReminderClick: (item: CalendarItem) => void;
	onEditNote: (filePath: string) => void;
	/** Whether `onEditNote` applies: only notes the Create-event flow could have written (directly in the event folder). */
	canEditNote: (filePath: string) => boolean;
}

/**
 * The note-mutating callbacks every CalendarRenderer host wires identically: write a drag's
 * dates, promote a reminder ghost, edit an event (and whether a note can be edited). Hosts keep their own construction, resize
 * policy, category toggle and day callbacks (see ADR-0001).
 */
export function createInteractions({ app, eventNotes, getSettings, rerender }: CalendarInteractionDeps): CalendarInteractions {
	return {
		onDropCommit: async (filePath, oldStart, newStart, newEnd) => {
			await eventNotes.move(filePath, oldStart, newStart, newEnd);
		},
		onReminderClick: (item) => void eventNotes.promoteReminder(item.filePath).then(rerender),
		onEditNote: (filePath) => new CreateEventModal(app, eventNotes, getSettings(), undefined, filePath).open(),
		canEditNote: (filePath) => isEventNotePath(filePath, eventNoteConfig(getSettings())),
	};
}
