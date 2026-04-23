export interface CalendarItem {
	filePath: string;
	title: string;
	dateStart: Date;
	dateEnd: Date;
	color?: string;
	tags?: string[];
	icon?: string;
}

export interface ColumnMapping {
	titleProp: string; // "__filename__" = use note name, otherwise frontmatter key
	startDateProp: string;
	endDateProp: string;
	iconProp: string;
}

export interface PluginSettings {
	defaultMapping: ColumnMapping;
	viewConfigs: Record<string, ColumnMapping>;
	colorMap: Record<string, string>;
}
