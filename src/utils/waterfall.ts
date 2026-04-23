import type { CalendarItem } from "../types";
import { MAX_WATERFALL_ROWS } from "../constants";

export interface RowAssignment {
	item: CalendarItem;
	row: number;
}

/**
 * Assign rows to calendar items using greedy algorithm.
 * Items sorted by dateStart. Each item placed in lowest row with no overlap.
 * Items beyond MAX_WATERFALL_ROWS are tracked as overflow.
 *
 * Returns { assignments, overflowCount }.
 */
export function assignRows(items: CalendarItem[]): {
	assignments: RowAssignment[];
	overflowCount: number;
} {
	const sorted = [...items].sort(
		(a, b) => a.dateStart.getTime() - b.dateStart.getTime(),
	);

	// Track end date of last item in each row
	const rowEnds: number[] = [];
	const assignments: RowAssignment[] = [];
	let overflowCount = 0;

	for (const item of sorted) {
		const startTime = item.dateStart.getTime();
		let placed = false;

		for (let r = 0; r < rowEnds.length && r < MAX_WATERFALL_ROWS; r++) {
			if (rowEnds[r] <= startTime) {
				rowEnds[r] = item.dateEnd.getTime();
				assignments.push({ item, row: r });
				placed = true;
				break;
			}
		}

		if (!placed && rowEnds.length < MAX_WATERFALL_ROWS) {
			const row = rowEnds.length;
			rowEnds.push(item.dateEnd.getTime());
			assignments.push({ item, row });
			placed = true;
		}

		if (!placed) {
			overflowCount++;
		}
	}

	return { assignments, overflowCount };
}
