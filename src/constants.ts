import type { ColumnMapping, PluginSettings } from "./types";

export const VIEW_TYPE_LINEAR_CALENDAR = "linear-calendar-view";

export const DEFAULT_MAPPING: ColumnMapping = {
	titleProp: "__filename__",
	startDateProp: "datestart",
	endDateProp: "dateend",
	iconProp: "icon",
	anniversaryProp: "anniversary",
};

export const DEFAULT_SETTINGS: PluginSettings = {
	defaultMapping: { ...DEFAULT_MAPPING },
	viewConfigs: {},
	colorMap: {},
	iconMap: {},
	alignMode: "date",
	dailyNoteColor: null,
	dailyNoteStyle: "tint",
	newEventFolder: "",
	newEventDateFormat: "YYYY-MM-DD",
	newEventTemplate: "",
};

// Google Calendar / Material Design palette
export const COLOR_PALETTE = [
	"#039BE5", // Peacock
	"#33B679", // Sage
	"#8E24AA", // Grape
	"#F4511E", // Tangerine
	"#3F51B5", // Blueberry
	"#0B8043", // Basil
	"#D50000", // Tomato
	"#F6BF26", // Banana
	"#7986CB", // Lavender
	"#E67C73", // Flamingo
	"#616161", // Graphite
	"#009688", // Teal
];

export const MAX_WATERFALL_ROWS = 8;
export const MAX_WATERFALL_COLS_VERT = 3;
