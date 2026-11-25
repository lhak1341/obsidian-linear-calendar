import type { AlignMode, CalendarItem } from "../types";
import { MAX_WATERFALL_COLS_VERT, MAX_WATERFALL_ROWS } from "../constants";
import { layoutBars, packSegments, type BarLayout, type DaySpan, type GhostPlacement, type RowSegment } from "./barLayout";
import { daysInMonth } from "./dateUtils";

/** A run of consecutive calendar days, possibly crossing a month or year. */
export interface DayWindow {
	start: Date;
	days: number;
}

/**
 * What a calendar shows: a whole year (one row per month, horizontal or vertical) or a day
 * window (one row of consecutive days). Hosts build this plain value; `resolveRange` answers
 * every question about it, so no renderer branches on the kind.
 */
export type ViewRange =
	| { kind: "year"; year: number; layout: "horizontal" | "vertical"; alignMode: AlignMode }
	| ({ kind: "window" } & DayWindow);

/** One day in a row. `column` is 0-based within the row (in a vertical year, the grid row). */
export interface RangeCell {
	year: number;
	/** 0-indexed. */
	month: number;
	day: number;
	column: number;
	/** 0 = Sunday. */
	weekday: number;
	/** A window's first of a month after its first column; labelled "M/1". */
	monthStart: boolean;
}

export interface RangeRow {
	label: string;
	/** Columns the row's grid has. Every row of a year has the same count. */
	columns: number;
	/** Columns before day 1 (weekday alignment); bar spans are shifted by it. */
	weekdayOffset: number;
	cells: RangeCell[];
	/** 0-based columns drawn as blank cells after the last day (date-aligned horizontal year only). */
	emptyColumns: number[];
}

/** Where a date sits: its row and its 0-based column in that row. */
export interface RangePosition {
	row: number;
	column: number;
}

export interface ResolvedRange {
	readonly layout: "horizontal" | "vertical";
	readonly rows: RangeRow[];
	/** Items the range covers, from a source that answers one year at a time. Feeds bars and chip counts. */
	items(scan: (year: number) => CalendarItem[]): CalendarItem[];
	/** Bars packed into the range's rows; `DaySpan.row` is a row index. */
	layoutBars(items: CalendarItem[]): BarLayout;
	/** The cell holding `date`, or null when the range does not show it. Time of day is ignored. */
	locate(date: Date): RangePosition | null;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function resolveRange(range: ViewRange): ResolvedRange {
	return range.kind === "year" ? resolveYear(range.year, range.layout, range.alignMode) : resolveWindow(range);
}

function resolveYear(year: number, layout: "horizontal" | "vertical", alignMode: AlignMode): ResolvedRange {
	const offsetOf = (month: number) => (alignMode === "weekday" ? new Date(year, month, 1).getDay() : 0);
	let columns = 31;
	for (let m = 0; m < 12; m++) columns = Math.max(columns, offsetOf(m) + daysInMonth(year, m));

	const rows: RangeRow[] = MONTH_NAMES.map((label, month) => {
		const days = daysInMonth(year, month);
		const weekdayOffset = offsetOf(month);
		const firstDow = new Date(year, month, 1).getDay();
		const cells = Array.from({ length: days }, (_, i): RangeCell => ({
			year, month, day: i + 1, column: weekdayOffset + i, weekday: (firstDow + i) % 7, monthStart: false,
		}));
		const padded = alignMode === "date" && layout === "horizontal";
		const emptyColumns = padded ? Array.from({ length: columns - days }, (_, i) => days + i) : [];
		return { label, columns, weekdayOffset, cells, emptyColumns };
	});

	return {
		layout,
		rows,
		items: (scan) => scan(year),
		layoutBars: (items) => layoutBars(items, year, layout === "vertical" ? MAX_WATERFALL_COLS_VERT : MAX_WATERFALL_ROWS),
		locate: (date) =>
			date.getFullYear() === year
				? { row: date.getMonth(), column: offsetOf(date.getMonth()) + date.getDate() - 1 }
				: null,
	};
}

/** A window's bars and cells share its single row. `DaySpan` days are then 1-based window columns. */
const WINDOW_ROW = 0;

function resolveWindow(window: DayWindow): ResolvedRange {
	const cells = Array.from({ length: window.days }, (_, column): RangeCell => {
		const d = dayAt(window.start, column);
		return {
			year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), column,
			weekday: d.getDay(), monthStart: d.getDate() === 1 && column > 0,
		};
	});
	const row: RangeRow = {
		label: MONTH_NAMES[window.start.getMonth()],
		columns: window.days,
		weekdayOffset: 0,
		cells,
		emptyColumns: [],
	};

	return {
		layout: "horizontal",
		rows: [row],
		items: (scan) => itemsInWindow(window, scan),
		layoutBars: (items) => layoutWindow(items, window, MAX_WATERFALL_ROWS),
		locate: (date) => {
			const column = dayNumber(date) - dayNumber(window.start);
			return column >= 0 && column < window.days ? { row: WINDOW_ROW, column } : null;
		},
	};
}

function dayNumber(d: Date): number {
	return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
}

/** Calendar date `offset` days from `date`'s, at local midnight; DST never shifts the day. */
export function dayAt(date: Date, offset: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

/** The last day inside the window. */
export function windowEnd({ start, days }: DayWindow): Date {
	return dayAt(start, days - 1);
}

/** The window's columns that `from`..`to` covers, or null when they don't touch it. */
function spanInWindow(window: DayWindow, from: Date, to: Date): DaySpan | null {
	const first = dayNumber(from) - dayNumber(window.start);
	const last = dayNumber(to) - dayNumber(window.start);
	if (last < 0 || first >= window.days) return null;
	return {
		row: WINDOW_ROW,
		startDay: Math.max(first, 0) + 1,
		endDay: Math.min(last, window.days - 1) + 1,
	};
}

const fullStart = (item: CalendarItem): Date => item.fullStart ?? item.dateStart;
const fullEnd = (item: CalendarItem): Date => item.fullEnd ?? item.dateEnd;

/**
 * A scan clamps items to its year, so an event across New Year comes back once per year: the two
 * are one item, told apart from two recurrences by their full start.
 */
function itemsInWindow(window: DayWindow, scan: (year: number) => CalendarItem[]): CalendarItem[] {
	const firstYear = window.start.getFullYear();
	const lastYear = windowEnd(window).getFullYear();
	const seen = new Set<string>();
	const items: CalendarItem[] = [];
	for (let year = firstYear; year <= lastYear; year++) {
		for (const item of scan(year)) {
			if (!spanInWindow(window, fullStart(item), fullEnd(item))) continue;
			const key = `${item.filePath}\0${dayNumber(fullStart(item))}\0${item.kind}`;
			if (seen.has(key)) continue;
			seen.add(key);
			items.push(item);
		}
	}
	return items;
}

/** One row of columns, so a dragged bar has only its home slice and never a ghost. */
function layoutWindow(items: CalendarItem[], window: DayWindow, maxLanes: number): BarLayout {
	const segments: RowSegment[] = [];
	for (const item of items) {
		const span = spanInWindow(window, fullStart(item), fullEnd(item));
		if (span) segments.push({ ...span, item });
	}
	const placements = packSegments(segments, maxLanes);
	return {
		placementsFor: (row) => (row === WINDOW_ROW ? placements : []),
		previewMove: (_homeRow, newStart, newEnd) => ({
			home: spanInWindow(window, newStart, newEnd),
			ghosts: [] as GhostPlacement[],
		}),
	};
}
