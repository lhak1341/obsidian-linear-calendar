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
}

export interface CalendarInteractions {
	onDropCommit: DropCommitFn;
	/** Resolves `false` when the promotion failed, so the clicked ghost can be clicked again. */
	onReminderClick: (item: CalendarItem) => Promise<boolean>;
	onEditNote: (filePath: string) => void;
	/** Whether `onEditNote` applies: only notes the Create-event flow could have written (directly in the event folder). */
	canEditNote: (filePath: string) => boolean;
}

/**
 * The note-mutating callbacks of every calendar: write a drag's dates, promote a reminder ghost,
 * edit an event (and whether a note can be edited). `CalendarRenderer` builds them from its deps;
 * no host wires them. None repaints: the scanner's `onChange` brings each write to the calendar.
 */
export function createInteractions({ app, eventNotes, getSettings }: CalendarInteractionDeps): CalendarInteractions {
	return {
		onDropCommit: async (filePath, oldStart, newStart, newEnd) => {
			await eventNotes.move(filePath, oldStart, newStart, newEnd);
		},
		onReminderClick: (item) => eventNotes.promoteReminder(item.filePath),
		onEditNote: (filePath) => new CreateEventModal(app, eventNotes, getSettings(), undefined, filePath).open(),
		canEditNote: (filePath) => isEventNotePath(filePath, eventNoteConfig(getSettings())),
	};
}
