import type { CalendarItem } from "../types";
import { daysInMonth } from "./dateUtils";

/** A run of days inside one month. `month` is 0-indexed, days are 1-indexed. */
export interface DaySpan {
	month: number;
	startDay: number;
	endDay: number;
}

/** One month's slice of an item. A bar spanning Jan 15 → Mar 10 has three. */
export interface MonthSegment extends DaySpan {
	item: CalendarItem;
}

export interface Placement {
	segment: MonthSegment;
	row: number;
}

export interface GhostPlacement extends DaySpan {
	row: number;
}

export interface MovePreview {
	/** The dragged bar's own slice in its home month, or null when the new dates leave that month. It keeps its current row. */
	home: DaySpan | null;
	/** The slices in every other month, each in a free row. A slice with no free row is left out, as a bar with none would be. */
	ghosts: GhostPlacement[];
}

/** Where every bar of a year sits, and where a dragged bar's slices would sit. */
export interface BarLayout {
	/** The month's segments with their rows, in start-day order. Segments past `maxRows` are dropped. */
	placementsFor(month: number): Placement[];
	/**
	 * Preview of moving a bar whose home slice is in `homeMonth` to `newStart`..`newEnd`.
	 * Placed bars stay where they are; ghosts take the first free row (the same cap as bars).
	 */
	previewMove(homeMonth: number, newStart: Date, newEnd: Date): MovePreview;
}

/**
 * Splits `start`..`end` into one span per month, clipped to `year`. Compares calendar days,
 * not timestamps, so a time-of-day on Dec 31 or Jan 1 never empties the result.
 */
export function splitByMonth(start: Date, end: Date, year: number): DaySpan[] {
	if (start.getFullYear() > year || end.getFullYear() < year) return [];
	const first = start.getFullYear() < year ? { month: 0, day: 1 } : { month: start.getMonth(), day: start.getDate() };
	const last = end.getFullYear() > year ? { month: 11, day: 31 } : { month: end.getMonth(), day: end.getDate() };
	if (first.month === last.month && first.day > last.day) return [];

	const spans: DaySpan[] = [];
	for (let month = first.month; month <= last.month; month++) {
		spans.push({
			month,
			startDay: month === first.month ? first.day : 1,
			endDay: month === last.month ? last.day : daysInMonth(year, month),
		});
	}
	return spans;
}

export function layoutBars(items: CalendarItem[], year: number, maxRows: number): BarLayout {
	const byMonth = new Map<number, MonthSegment[]>();
	for (const item of items) {
		for (const span of splitByMonth(item.dateStart, item.dateEnd, year)) {
			const segments = byMonth.get(span.month) ?? [];
			segments.push({ ...span, item });
			byMonth.set(span.month, segments);
		}
	}

	const placed = new Map<number, Placement[]>();
	for (const [month, segments] of byMonth) placed.set(month, pack(segments, maxRows));

	// Built on first preview, then reused for the rest of the drag.
	const occupancy = new Map<number, [number, number][][]>();
	const rowsOf = (month: number): [number, number][][] => {
		let rows = occupancy.get(month);
		if (!rows) {
			rows = [];
			for (const { segment, row } of placed.get(month) ?? []) (rows[row] ??= []).push([segment.startDay, segment.endDay]);
			occupancy.set(month, rows);
		}
		return rows;
	};

	return {
		placementsFor: (month) => placed.get(month) ?? [],
		previewMove(homeMonth, newStart, newEnd) {
			let home: DaySpan | null = null;
			const ghosts: GhostPlacement[] = [];
			for (const span of splitByMonth(newStart, newEnd, year)) {
				if (span.month === homeMonth) {
					home = span;
					continue;
				}
				const rows = rowsOf(span.month);
				for (let row = 0; row < maxRows; row++) {
					if (!(rows[row] ?? []).some(([s, e]) => span.startDay <= e && span.endDay >= s)) {
						ghosts.push({ ...span, row });
						break;
					}
				}
			}
			return { home, ghosts };
		},
	};
}

/**
 * Greedy interval packing: segments sorted by startDay, each placed in the first row whose last
 * occupant ends strictly before it starts (same-day adjacency goes to a new row). Segments that
 * would need more than `maxRows` rows are dropped.
 */
function pack(segments: MonthSegment[], maxRows: number): Placement[] {
	const sorted = [...segments].sort((a, b) => a.startDay - b.startDay);
	const rowEnds: number[] = [];
	const placements: Placement[] = [];

	for (const segment of sorted) {
		let row = rowEnds.findIndex((end) => end < segment.startDay);
		if (row === -1) row = rowEnds.length;
		if (row >= maxRows) continue;
		rowEnds[row] = segment.endDay;
		placements.push({ segment, row });
	}
	return placements;
}

/**
 * CSS grid placement for a slice. Horizontal: days run along columns, rows stack below the
 * header (row 1). Vertical: days run down rows, the first column holds the date.
 * `weekdayOffset` shifts day 1 to its weekday column (0 in date-aligned mode).
 */
export function gridArea(
	span: DaySpan,
	row: number,
	weekdayOffset: number,
	layout: "horizontal" | "vertical",
): { gridColumn: string; gridRow: string } {
	const days = `${weekdayOffset + span.startDay} / span ${span.endDay - span.startDay + 1}`;
	return layout === "vertical"
		? { gridColumn: `${row + 2}`, gridRow: days }
		: { gridColumn: days, gridRow: `${row + 2}` };
}
