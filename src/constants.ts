import { DEFAULT_FONT_ROLE_SETTINGS } from "@lhak/style/obsidian-helpers/font-roles";
import type { Hue } from "@lhak/style";
import type { ColumnMapping, PluginSettings } from "./types";

export const VIEW_TYPE_LINEAR_CALENDAR = "linear-calendar-view";

export const DEFAULT_MAPPING: ColumnMapping = {
	titleProp: "__filename__",
	startDateProp: "datestart",
	endDateProp: "dateend",
	iconProp: "icon",
	anniversaryProp: "anniversary",
	descriptionProp: "description",
	remindProp: "remindon",
};

export const DEFAULT_SETTINGS: PluginSettings = {
	defaultMapping: { ...DEFAULT_MAPPING },
	colorMap: {},
	iconMap: {},
	alignMode: "date",
	dailyNoteColor: null,
	dailyNoteStyle: "tint",
	newEventFolder: "",
	newEventDateFormat: "YYYY-MM-DD",
	newEventTemplate: "",
	...DEFAULT_FONT_ROLE_SETTINGS,
	japaneseWeekdayLabels: false,
};

/**
 * The 8 contract hues in the @lhak/style fixed order (`HUES` in its token contract, which the
 * package root does not export). Tags without a chosen hue take them in this order, repeating
 * past 8; names and icons tell repeats apart.
 */
export const HUE_ORDER = ["blue", "orange", "green", "purple", "cyan", "pink", "yellow", "red"] as const satisfies readonly Hue[];

// Every hue appears in HUE_ORDER: a hue the contract adds fails this line.
const _everyHue: Exclude<Hue, (typeof HUE_ORDER)[number]> extends never ? true : never = true;
void _everyHue;

/** The CSS colour of a hue, read from the contract (resolves under `.lk-root`). */
export function hueColour(hue: Hue): string {
	return `var(--lk-${hue})`;
}

export const MAX_WATERFALL_ROWS = 8;
export const MAX_WATERFALL_COLS_VERT = 3;
