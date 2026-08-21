export type AlignMode = "date" | "weekday";

export type FontChoice = "plugin" | "obsidian-interface" | "obsidian-text" | "obsidian-monospace" | "custom";

/** Writes a drag-committed date change to a note's frontmatter. */
export type DropCommitFn = (filePath: string, oldStart: Date, newStart: Date, newEnd: Date) => Promise<void>;

export interface CalendarItem {
	filePath: string;
	title: string;
	dateStart: Date;
	dateEnd: Date;
	color?: string;
	tags?: string[];
	icon?: string;
	anniversary?: boolean;
	description?: string;
	/** True for a synthetic ghost item rendered from another note's remindProp — filePath still points at that source note. */
	isReminder?: boolean;
}

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
	font: FontChoice;
	fontCustom: string;
	japaneseWeekdayLabels: boolean;
}
