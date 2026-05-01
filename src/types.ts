export type AlignMode = "date" | "weekday";

export interface CalendarItem {
	filePath: string;
	title: string;
	dateStart: Date;
	dateEnd: Date;
	color?: string;
	tags?: string[];
	icon?: string;
	anniversary?: boolean;
}

export interface ColumnMapping {
	titleProp: string; // "__filename__" = use note name, otherwise frontmatter key
	startDateProp: string;
	endDateProp: string;
	iconProp: string;
	anniversaryProp: string;
}

export type DailyNoteStyle = "tint" | "border-top";

export interface PluginSettings {
	defaultMapping: ColumnMapping;
	viewConfigs: Record<string, ColumnMapping>;
	colorMap: Record<string, string>;
	alignMode: AlignMode;
	dailyNoteColor: string | null; // null = use accent
	dailyNoteStyle: DailyNoteStyle;
}
