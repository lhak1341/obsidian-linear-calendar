import type { Hue } from "@lhak/style";
import type { FontRoleSettings } from "@lhak/style/obsidian-helpers/font-roles";

export type AlignMode = "date" | "weekday";

/** Writes a drag-committed date change to a note's frontmatter. */
export type DropCommitFn = (filePath: string, oldStart: Date, newStart: Date, newEnd: Date) => Promise<void>;

export interface CalendarItemBase {
	filePath: string;
	title: string;
	/** The item's own span, never cut to what a view shows (a recurrence's is its projected span); layouts clip it per row. */
	dateStart: Date;
	dateEnd: Date;
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

/** What a note yields before `expandForSpan` decides per-year kind. `anniversary` = repeats yearly. */
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

/**
 * A tag's colour: one of the 8 @lhak/style contract hues, or `"grey"`, the theme's neutral
 * (`--lk-text-muted`), which the contract has no hue for. Grey is chosen, never assigned.
 */
export type TagHue = Hue | "grey";

/** Font keys (`fontHeading`, `fontHeadingCustom`, …) come from the shared @lhak/style font-role helper. */
export interface PluginSettings extends FontRoleSettings {
	defaultMapping: ColumnMapping;
	/** Tag → hue name (one of the 8 contract hues, or grey); automatic hues repeat past 8 tags. */
	colorMap: Record<string, TagHue>;
	iconMap: Record<string, string>;
	alignMode: AlignMode;
	dailyNoteColor: string | null; // null = use accent
	dailyNoteStyle: DailyNoteStyle;
	newEventFolder: string;
	newEventDateFormat: string;
	newEventTemplate: string;
	japaneseWeekdayLabels: boolean;
}
