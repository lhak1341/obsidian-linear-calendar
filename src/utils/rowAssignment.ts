import type { MonthSegment } from "./segmentByMonth";
import type { RowOccupancy } from "./dragUtils";

export interface RowAssignment {
	segment: MonthSegment;
	row: number;
}

/**
 * Assign rows to segments using a greedy interval-packing algorithm.
 * Segments are sorted by startDay, then placed in the first row whose
 * last occupant ends strictly before the new segment starts (strict <,
 * so same-day adjacency goes to a new row). Segments that would exceed
 * maxRows are silently dropped.
 */
export function assignRowsForMonth(
	segments: MonthSegment[],
	maxRows: number,
): RowAssignment[] {
	const sorted = [...segments].sort((a, b) => a.startDay - b.startDay);
	const rowEnds: number[] = [];
	const assignments: RowAssignment[] = [];

	for (const segment of sorted) {
		let placed = false;

		for (let r = 0; r < rowEnds.length && r < maxRows; r++) {
			if (rowEnds[r] < segment.startDay) {
				rowEnds[r] = segment.endDay;
				assignments.push({ segment, row: r });
				placed = true;
				break;
			}
		}

		if (!placed && rowEnds.length < maxRows) {
			const row = rowEnds.length;
			rowEnds.push(segment.endDay);
			assignments.push({ segment, row });
		}
	}

	return assignments;
}

/** Reshape row assignments into the row->intervals map DragHandler's findFreeRow expects. */
export function rowAssignmentsToOccupancy(assignments: RowAssignment[]): RowOccupancy {
	const occ: RowOccupancy = new Map();
	for (const { segment, row } of assignments) {
		if (!occ.has(row)) occ.set(row, []);
		occ.get(row)!.push([segment.startDay, segment.endDay]);
	}
	return occ;
}
