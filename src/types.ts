export type AlignMode = "date" | "weekday";

export type FontChoice = "plugin" | "obsidian-interface" | "obsidian-text" | "obsidian-monospace" | "custom";

/** Writes a drag-committed date change to a note's frontmatter. */
export type DropCommitFn = (filePath: string, oldStart: Date, newStart: Date, newEnd: Date) => Promise<void>;

export interface CalendarItemBase {
	filePath: string;
	title: string;
	dateStart: Date;
	dateEnd: Date;
	/** The note's own span before `expandForYear` clamps `dateStart`/`dateEnd` to the viewed year. Drag and tooltip read these. */
	fullStart?: Date;
	fullEnd?: Date;
	color?: string;
	tags?: string[];
	icon?: string;
	description?: string;
}

/**
 * What a bar on the calendar is:
 * - `event`: a note's own dates (including an anniversary note in its origin year).
 * - `recurrence`: a copy of an anniversary note projected into a later year; `originYear` is the note's own dateStart year.
 * - `reminder`: a synthetic ghost rendered from another note's remindProp — filePath still points at that source note.
 */
export type CalendarItem = CalendarItemBase &
	({ kind: "event" | "reminder" } | { kind: "recurrence"; originYear: number });

/** What a note yields before `expandForYear` decides per-year kind. `anniversary` = repeats yearly. */
export type RawCalendarItem = CalendarItemBase & { kind: "event" | "reminder"; anniversary?: boolean };

export interface ColumnMapping {
	titleProp: string; // "__filename__" = use note name, otherwise frontmatter key
	startDateProp: string;
	endDateProp: string;
	iconProp: string;
	anniversaryProp: string;
	descriptionProp: string;
	remindProp: string;
}

export type DailyNoteStyle = "tint" | "border-top";

export interface PluginSettings {
	defaultMapping: ColumnMapping;
	viewConfigs: Record<string, ColumnMapping>;
	colorMap: Record<string, string>;
	iconMap: Record<string, string>;
	alignMode: AlignMode;
	dailyNoteColor: string | null; // null = use accent
	dailyNoteStyle: DailyNoteStyle;
	newEventFolder: string;
	newEventDateFormat: string;
	newEventTemplate: string;
	fontHeading: FontChoice;
	fontHeadingCustom: string;
	fontBody: FontChoice;
	fontBodyCustom: string;
	fontMono: FontChoice;
	fontMonoCustom: string;
	japaneseWeekdayLabels: boolean;
}
