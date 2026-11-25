import type { CalendarItem } from "../types";
import { daysInMonth } from "./dateUtils";

/**
 * A run of days inside one row of a view range. `row` is the range's row index (in a year, the
 * 0-based month); days are 1-indexed (in a year, days of the month; in a day window, columns).
 */
export interface DaySpan {
	row: number;
	startDay: number;
	endDay: number;
}

/** One row's slice of an item. In a year, a bar spanning Jan 15 → Mar 10 has three. */
export interface RowSegment extends DaySpan {
	item: CalendarItem;
}

/** A segment and the lane (stacking position within its row, 0 = first) it is drawn in. */
export interface Placement {
	segment: RowSegment;
	lane: number;
}

export interface GhostPlacement extends DaySpan {
	lane: number;
}

export interface MovePreview {
	/** The dragged bar's own slice in its home row, or null when the new dates leave that row. It keeps its current lane. */
	home: DaySpan | null;
	/** The slices in every other row, each in a free lane. A slice with no free lane is left out, as a bar with none would be. */
	ghosts: GhostPlacement[];
}

/** Where every bar of a range sits, and where a dragged bar's slices would sit. */
export interface BarLayout {
	/** The row's segments with their lanes, in start-day order. Segments past `maxLanes` are dropped. */
	placementsFor(row: number): Placement[];
	/**
	 * Preview of moving a bar whose home slice is in `homeRow` to `newStart`..`newEnd`.
	 * Placed bars stay where they are; ghosts take the first free lane (the same cap as bars).
	 */
	previewMove(homeRow: number, newStart: Date, newEnd: Date): MovePreview;
}

/**
 * Splits `start`..`end` into one span per month (its row in a year range), clipped to `year`. Compares calendar days,
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
			row: month,
			startDay: month === first.month ? first.day : 1,
			endDay: month === last.month ? last.day : daysInMonth(year, month),
		});
	}
	return spans;
}

/** A year's bars, one row per month. */
export function layoutBars(items: CalendarItem[], year: number, maxLanes: number): BarLayout {
	const byRow = new Map<number, RowSegment[]>();
	for (const item of items) {
		for (const span of splitByMonth(item.dateStart, item.dateEnd, year)) {
			const segments = byRow.get(span.row) ?? [];
			segments.push({ ...span, item });
			byRow.set(span.row, segments);
		}
	}

	const placed = new Map<number, Placement[]>();
	for (const [row, segments] of byRow) placed.set(row, packSegments(segments, maxLanes));

	// Built on first preview, then reused for the rest of the drag.
	const occupancy = new Map<number, [number, number][][]>();
	const lanesOf = (row: number): [number, number][][] => {
		let lanes = occupancy.get(row);
		if (!lanes) {
			lanes = [];
			for (const { segment, lane } of placed.get(row) ?? []) (lanes[lane] ??= []).push([segment.startDay, segment.endDay]);
			occupancy.set(row, lanes);
		}
		return lanes;
	};

	return {
		placementsFor: (row) => placed.get(row) ?? [],
		previewMove(homeRow, newStart, newEnd) {
			let home: DaySpan | null = null;
			const ghosts: GhostPlacement[] = [];
			for (const span of splitByMonth(newStart, newEnd, year)) {
				if (span.row === homeRow) {
					home = span;
					continue;
				}
				const lanes = lanesOf(span.row);
				for (let lane = 0; lane < maxLanes; lane++) {
					if (!(lanes[lane] ?? []).some(([s, e]) => span.startDay <= e && span.endDay >= s)) {
						ghosts.push({ ...span, lane });
						break;
					}
				}
			}
			return { home, ghosts };
		},
	};
}

/**
 * Greedy interval packing: segments sorted by startDay, each placed in the first lane whose last
 * occupant ends strictly before it starts (same-day adjacency goes to a new lane). Segments that
 * would need more than `maxLanes` lanes are dropped.
 */
export function packSegments(segments: RowSegment[], maxLanes: number): Placement[] {
	const sorted = [...segments].sort((a, b) => a.startDay - b.startDay);
	const laneEnds: number[] = [];
	const placements: Placement[] = [];

	for (const segment of sorted) {
		let lane = laneEnds.findIndex((end) => end < segment.startDay);
		if (lane === -1) lane = laneEnds.length;
		if (lane >= maxLanes) continue;
		laneEnds[lane] = segment.endDay;
		placements.push({ segment, lane });
	}
	return placements;
}

/**
 * CSS grid placement for a slice in `lane`. Horizontal: days run along columns, lanes stack below
 * the header (grid row 1). Vertical: days run down grid rows, the first column holds the date.
 * `weekdayOffset` shifts day 1 to its weekday column (0 in date-aligned mode).
 */
export function gridArea(
	span: DaySpan,
	lane: number,
	weekdayOffset: number,
	layout: "horizontal" | "vertical",
): { gridColumn: string; gridRow: string } {
	const days = `${weekdayOffset + span.startDay} / span ${span.endDay - span.startDay + 1}`;
	return layout === "vertical"
		? { gridColumn: `${lane + 2}`, gridRow: days }
		: { gridColumn: days, gridRow: `${lane + 2}` };
}
