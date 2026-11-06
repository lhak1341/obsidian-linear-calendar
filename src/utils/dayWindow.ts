import type { CalendarItem } from "../types";
import { packSegments, type BarLayout, type DaySpan, type GhostPlacement, type MonthSegment } from "./barLayout";

/** A run of consecutive calendar days, possibly crossing a month or year. */
export interface DayWindow {
	start: Date;
	days: number;
}

export interface WindowDay {
	year: number;
	/** 0-indexed. */
	month: number;
	day: number;
}

/**
 * A window's bars and cells live in one grid row, so they share one `MonthRowRef`, and this stands
 * in for its month. `DaySpan` days are then 1-based window columns, not days of a month.
 */
export const WINDOW_ROW = 0;

function dayNumber(d: Date): number {
	return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
}

/** Calendar date `offset` days from `date`'s, at local midnight; DST never shifts the day. */
export function dayAt(date: Date, offset: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

export function windowDays({ start, days }: DayWindow): WindowDay[] {
	return Array.from({ length: days }, (_, i) => {
		const d = dayAt(start, i);
		return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
	});
}

/** The last day inside the window. */
export function windowEnd({ start, days }: DayWindow): Date {
	return dayAt(start, days - 1);
}

/** 0-based column of `date`, or null when it falls outside the window. */
export function windowColumn({ start, days }: DayWindow, date: Date): number | null {
	const column = dayNumber(date) - dayNumber(start);
	return column >= 0 && column < days ? column : null;
}

/** The window's columns that `from`..`to` covers, or null when they don't touch it. */
function spanInWindow(window: DayWindow, from: Date, to: Date): DaySpan | null {
	const first = dayNumber(from) - dayNumber(window.start);
	const last = dayNumber(to) - dayNumber(window.start);
	if (last < 0 || first >= window.days) return null;
	return {
		month: WINDOW_ROW,
		startDay: Math.max(first, 0) + 1,
		endDay: Math.min(last, window.days - 1) + 1,
	};
}

const fullStart = (item: CalendarItem): Date => item.fullStart ?? item.dateStart;
const fullEnd = (item: CalendarItem): Date => item.fullEnd ?? item.dateEnd;

/**
 * What the window shows, from a source that answers one year at a time. A scan clamps items to its
 * year, so an event across New Year comes back once per year: the two are one item, told apart from
 * two recurrences by their full start.
 */
export function itemsInWindow(window: DayWindow, scan: (year: number) => CalendarItem[]): CalendarItem[] {
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

/** `BarLayout` over a window: one row of columns, so a dragged bar has only its home slice and never a ghost. */
export function layoutWindow(items: CalendarItem[], window: DayWindow, maxRows: number): BarLayout {
	const segments: MonthSegment[] = [];
	for (const item of items) {
		const span = spanInWindow(window, fullStart(item), fullEnd(item));
		if (span) segments.push({ ...span, item });
	}
	const placements = packSegments(segments, maxRows);
	return {
		placementsFor: (month) => (month === WINDOW_ROW ? placements : []),
		previewMove: (_homeMonth, newStart, newEnd) => ({
			home: spanInWindow(window, newStart, newEnd),
			ghosts: [] as GhostPlacement[],
		}),
	};
}
