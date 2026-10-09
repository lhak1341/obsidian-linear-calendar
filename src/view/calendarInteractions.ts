import type { App } from "obsidian";
import type { CalendarItem, DropCommitFn, PluginSettings } from "../types";
import type { NoteCreator } from "../NoteCreator";
import { CreateEventModal } from "../CreateEventModal";
import { eventNoteConfig } from "../utils/eventNotePath";
import { commitDrag } from "../utils/frontmatterUtils";

export interface CalendarInteractionDeps {
	app: App;
	noteCreator: NoteCreator;
	/** Read at call time — settings are mutable. */
	getSettings: () => PluginSettings;
	/** Called after a reminder promotion lands, so the host can repaint with the new note. */
	rerender: () => void;
}

export interface CalendarInteractions {
	onDropCommit: DropCommitFn;
	onReminderClick: (item: CalendarItem) => void;
	onEditNote: (filePath: string) => void;
}

/**
 * The note-mutating callbacks every CalendarRenderer host wires identically: write a drag's
 * dates, promote a reminder ghost, edit an event. Hosts keep their own construction, resize
 * policy, category toggle and day callbacks (see ADR-0001).
 */
export function createInteractions({ app, noteCreator, getSettings, rerender }: CalendarInteractionDeps): CalendarInteractions {
	return {
		onDropCommit: (filePath, oldStart, newStart, newEnd) => {
			const settings = getSettings();
			return commitDrag(app, settings.defaultMapping, eventNoteConfig(settings), filePath, oldStart, newStart, newEnd);
		},
		onReminderClick: (item) => void noteCreator.promoteReminder(item.filePath).then(rerender),
		onEditNote: (filePath) => new CreateEventModal(app, noteCreator, getSettings(), undefined, filePath).open(),
	};
}
