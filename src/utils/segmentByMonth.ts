import type { CalendarItem } from "../types";

export interface MonthSegment {
	item: CalendarItem;
	month: number; // 0-indexed
	startDay: number; // 1-indexed day of month
	endDay: number; // 1-indexed day of month
}

/**
 * Split a CalendarItem into per-month segments.
 * An event spanning Jan 15 → Mar 10 becomes:
 *   { month: 0, startDay: 15, endDay: 31 }
 *   { month: 1, startDay: 1, endDay: 28 }
 *   { month: 2, startDay: 1, endDay: 10 }
 */
export function segmentByMonth(item: CalendarItem): MonthSegment[] {
	const segments: MonthSegment[] = [];
	const startMonth = item.dateStart.getMonth();
	const endMonth = item.dateEnd.getMonth();
	const startYear = item.dateStart.getFullYear();
	const endYear = item.dateEnd.getFullYear();

	if (startYear === endYear && startMonth === endMonth) {
		// Single month
		segments.push({
			item,
			month: startMonth,
			startDay: item.dateStart.getDate(),
			endDay: item.dateEnd.getDate(),
		});
	} else {
		// First month: start day → end of month
		const firstMonthDays = daysInMonth(startMonth, startYear);
		segments.push({
			item,
			month: startMonth,
			startDay: item.dateStart.getDate(),
			endDay: firstMonthDays,
		});

		// Middle months: full month
		// Wrap m/y before the condition check so year-crossing events don't
		// incorrectly emit a full-month segment for what is actually the last month.
		let m = startMonth + 1;
		let y = startYear;
		while (true) {
			if (m > 11) { m = 0; y++; }
			if (!(y < endYear || (y === endYear && m < endMonth))) break;
			const days = daysInMonth(m, y);
			segments.push({
				item,
				month: m,
				startDay: 1,
				endDay: days,
			});
			m++;
		}

		// Last month: 1 → end day
		segments.push({
			item,
			month: endMonth,
			startDay: 1,
			endDay: item.dateEnd.getDate(),
		});
	}

	return segments;
}

function daysInMonth(month: number, year: number): number {
	return new Date(year, month + 1, 0).getDate();
}

/**
 * Group segments by month index (0-11).
 */
export function groupSegmentsByMonth(
	items: CalendarItem[],
): Map<number, MonthSegment[]> {
	const map = new Map<number, MonthSegment[]>();
	for (let m = 0; m < 12; m++) {
		map.set(m, []);
	}

	for (const item of items) {
		const segments = segmentByMonth(item);
		for (const seg of segments) {
			map.get(seg.month)!.push(seg);
		}
	}

	return map;
}
