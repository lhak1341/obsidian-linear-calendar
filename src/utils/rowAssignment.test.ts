import { describe, it, expect } from "vitest";
import { assignRowsForMonth, rowAssignmentsToOccupancy } from "./rowAssignment";
import type { MonthSegment } from "./segmentByMonth";

function seg(startDay: number, endDay: number): MonthSegment {
	return {
		item: {
			filePath: "f.md",
			title: "T",
			dateStart: new Date(2024, 0, startDay),
			dateEnd: new Date(2024, 0, endDay),
		},
		month: 0,
		startDay,
		endDay,
	};
}

describe("assignRowsForMonth", () => {
	it("empty input → empty output", () => {
		expect(assignRowsForMonth([], 8)).toEqual([]);
	});

	it("single segment → row 0", () => {
		const [a] = assignRowsForMonth([seg(1, 10)], 8);
		expect(a.row).toBe(0);
	});

	it("two non-overlapping segments share row 0", () => {
		const result = assignRowsForMonth([seg(1, 9), seg(10, 20)], 8);
		expect(result.map((r) => r.row)).toEqual([0, 0]);
	});

	it("two fully overlapping segments go to rows 0 and 1", () => {
		const result = assignRowsForMonth([seg(1, 31), seg(1, 31)], 8);
		expect(result.map((r) => r.row)).toEqual([0, 1]);
	});

	it("same-day adjacency uses a new row (strict < check)", () => {
		// A ends day 10, B starts day 10 — rowEnds[0]=10, 10 < 10 is false
		const result = assignRowsForMonth([seg(1, 10), seg(10, 20)], 8);
		expect(result[0].row).toBe(0);
		expect(result[1].row).toBe(1);
	});

	it("gap of 1 day allows reuse of row (rowEnds < startDay)", () => {
		// A ends day 9, B starts day 10 — rowEnds[0]=9, 9 < 10 is true
		const result = assignRowsForMonth([seg(1, 9), seg(10, 20)], 8);
		expect(result[0].row).toBe(0);
		expect(result[1].row).toBe(0);
	});

	it("segments exceeding maxRows are silently dropped", () => {
		// 3 fully overlapping, maxRows=2 → only 2 assigned
		const result = assignRowsForMonth([seg(1, 31), seg(1, 31), seg(1, 31)], 2);
		expect(result).toHaveLength(2);
		expect(result[0].row).toBe(0);
		expect(result[1].row).toBe(1);
	});

	it("out-of-order input is sorted by startDay before assignment", () => {
		// B starts later but is passed first — should still pack efficiently
		const b = seg(15, 25);
		const a = seg(1, 10);
		const result = assignRowsForMonth([b, a], 8);
		// After sort: a(1-10), b(15-25) — both fit in row 0
		expect(result).toHaveLength(2);
		expect(result.find((r) => r.segment === a)?.row).toBe(0);
		expect(result.find((r) => r.segment === b)?.row).toBe(0);
	});

	it("packs greedily into earliest available row", () => {
		// a(1-10), b(1-10), c(11-20) → a→row0, b→row1, c→row0 (row0 freed at 10, c starts 11)
		const a = seg(1, 10);
		const b = seg(1, 10);
		const c = seg(11, 20);
		const result = assignRowsForMonth([a, b, c], 8);
		expect(result.find((r) => r.segment === a)?.row).toBe(0);
		expect(result.find((r) => r.segment === b)?.row).toBe(1);
		expect(result.find((r) => r.segment === c)?.row).toBe(0);
	});

	it("maxRows=0 drops all segments", () => {
		expect(assignRowsForMonth([seg(1, 10)], 0)).toHaveLength(0);
	});

	it("preserves segment identity in output", () => {
		const s = seg(5, 15);
		const [result] = assignRowsForMonth([s], 8);
		expect(result.segment).toBe(s);
	});
});

describe("rowAssignmentsToOccupancy", () => {
	it("empty input → empty map", () => {
		expect(rowAssignmentsToOccupancy([])).toEqual(new Map());
	});

	it("groups intervals by row", () => {
		const a = seg(1, 10);
		const b = seg(11, 20);
		const c = seg(1, 31);
		const occ = rowAssignmentsToOccupancy([
			{ segment: a, row: 0 },
			{ segment: b, row: 0 },
			{ segment: c, row: 1 },
		]);
		expect(occ.get(0)).toEqual([[1, 10], [11, 20]]);
		expect(occ.get(1)).toEqual([[1, 31]]);
	});

	it("round-trips assignRowsForMonth's output into the shape findFreeRow expects", () => {
		const assignments = assignRowsForMonth([seg(1, 10), seg(1, 10), seg(11, 20)], 8);
		const occ = rowAssignmentsToOccupancy(assignments);
		expect(occ.get(0)).toEqual([[1, 10], [11, 20]]);
		expect(occ.get(1)).toEqual([[1, 10]]);
	});
});
