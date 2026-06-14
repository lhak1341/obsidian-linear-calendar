import { describe, it, expect } from "vitest";
import {
	addDays,
	mDays,
	segmentDates,
	findFreeRow,
	newDatesFromDelta,
	type RowOccupancy,
} from "./dragUtils";

describe("addDays", () => {
	it("returns same date for delta 0", () => {
		const d = new Date(2024, 2, 15);
		expect(addDays(d, 0)).toEqual(new Date(2024, 2, 15));
	});

	it("advances by positive days", () => {
		expect(addDays(new Date(2024, 0, 28), 5)).toEqual(new Date(2024, 1, 2));
	});

	it("retreats by negative days", () => {
		expect(addDays(new Date(2024, 2, 1), -1)).toEqual(new Date(2024, 1, 29));
	});

	it("crosses year boundary forward", () => {
		expect(addDays(new Date(2024, 11, 30), 3)).toEqual(new Date(2025, 0, 2));
	});

	it("crosses year boundary backward", () => {
		expect(addDays(new Date(2025, 0, 1), -1)).toEqual(new Date(2024, 11, 31));
	});

	it("does not mutate the input date", () => {
		const original = new Date(2024, 5, 10);
		addDays(original, 7);
		expect(original).toEqual(new Date(2024, 5, 10));
	});
});

describe("mDays", () => {
	it("returns 31 for January", () => {
		expect(mDays(0, 2024)).toBe(31);
	});

	it("returns 28 for February in a non-leap year", () => {
		expect(mDays(1, 2023)).toBe(28);
	});

	it("returns 29 for February in a leap year", () => {
		expect(mDays(1, 2024)).toBe(29);
	});

	it("returns 30 for April", () => {
		expect(mDays(3, 2024)).toBe(30);
	});

	it("returns 31 for December", () => {
		expect(mDays(11, 2024)).toBe(31);
	});
});

describe("segmentDates", () => {
	it("returns a single segment when start and end are in the same month", () => {
		const segs = segmentDates(new Date(2024, 3, 5), new Date(2024, 3, 20), 2024);
		expect(segs).toEqual([{ month: 3, startDay: 5, endDay: 20 }]);
	});

	it("returns multiple segments when spanning months", () => {
		const segs = segmentDates(new Date(2024, 1, 20), new Date(2024, 3, 10), 2024);
		expect(segs).toEqual([
			{ month: 1, startDay: 20, endDay: 29 }, // Feb 2024 has 29 days
			{ month: 2, startDay: 1, endDay: 31 },  // March
			{ month: 3, startDay: 1, endDay: 10 },  // April
		]);
	});

	it("clamps start to Jan 1 when event begins before the year", () => {
		const segs = segmentDates(new Date(2023, 10, 1), new Date(2024, 1, 15), 2024);
		expect(segs[0]).toEqual({ month: 0, startDay: 1, endDay: 31 }); // Jan clamped
		expect(segs[1]).toEqual({ month: 1, startDay: 1, endDay: 15 });
	});

	it("clamps end to Dec 31 when event ends after the year", () => {
		const segs = segmentDates(new Date(2024, 10, 10), new Date(2025, 2, 1), 2024);
		expect(segs[segs.length - 1]).toEqual({ month: 11, startDay: 1, endDay: 31 }); // Dec clamped
	});

	it("returns empty array when event is entirely before the year", () => {
		expect(segmentDates(new Date(2023, 0, 1), new Date(2023, 11, 31), 2024)).toEqual([]);
	});

	it("returns empty array when event is entirely after the year", () => {
		expect(segmentDates(new Date(2025, 0, 1), new Date(2025, 5, 1), 2024)).toEqual([]);
	});

	it("handles single-day event", () => {
		const segs = segmentDates(new Date(2024, 6, 4), new Date(2024, 6, 4), 2024);
		expect(segs).toEqual([{ month: 6, startDay: 4, endDay: 4 }]);
	});

	it("spans the full year when event covers Jan 1 to Dec 31", () => {
		const segs = segmentDates(new Date(2024, 0, 1), new Date(2024, 11, 31), 2024);
		expect(segs).toHaveLength(12);
		expect(segs[0]).toEqual({ month: 0, startDay: 1, endDay: 31 });
		expect(segs[11]).toEqual({ month: 11, startDay: 1, endDay: 31 });
	});

	it("handles Feb correctly in a leap year for mid-month spanning", () => {
		const segs = segmentDates(new Date(2024, 1, 15), new Date(2024, 2, 5), 2024);
		expect(segs).toEqual([
			{ month: 1, startDay: 15, endDay: 29 }, // leap year Feb
			{ month: 2, startDay: 1, endDay: 5 },
		]);
	});

	it("handles Feb correctly in a non-leap year", () => {
		const segs = segmentDates(new Date(2023, 1, 15), new Date(2023, 2, 5), 2023);
		expect(segs).toEqual([
			{ month: 1, startDay: 15, endDay: 28 },
			{ month: 2, startDay: 1, endDay: 5 },
		]);
	});
});

describe("findFreeRow", () => {
	it("returns row 0 when occupancy is empty", () => {
		const occ: RowOccupancy = new Map();
		expect(findFreeRow(occ, 1, 10)).toBe(0);
	});

	it("returns row 0 when row 0 has no overlapping span", () => {
		const occ: RowOccupancy = new Map([[0, [[15, 25]]]]);
		expect(findFreeRow(occ, 1, 10)).toBe(0);
	});

	it("returns row 1 when row 0 is fully occupied by an overlapping span", () => {
		const occ: RowOccupancy = new Map([[0, [[1, 10]]]]);
		expect(findFreeRow(occ, 5, 15)).toBe(1);
	});

	it("detects overlap when new span starts at the same day existing span ends", () => {
		// [1,10] and [10,20] overlap (share day 10)
		const occ: RowOccupancy = new Map([[0, [[1, 10]]]]);
		expect(findFreeRow(occ, 10, 20)).toBe(1);
	});

	it("no overlap when spans are strictly adjacent", () => {
		// [1,9] and [10,20] do not overlap
		const occ: RowOccupancy = new Map([[0, [[1, 9]]]]);
		expect(findFreeRow(occ, 10, 20)).toBe(0);
	});

	it("skips multiple occupied rows and finds first free one", () => {
		const occ: RowOccupancy = new Map([
			[0, [[1, 31]]],
			[1, [[1, 31]]],
			[2, [[1, 15]]],
		]);
		expect(findFreeRow(occ, 1, 10)).toBe(3); // rows 0,1,2 all conflict
	});

	it("places in a row that has spans but none overlapping", () => {
		const occ: RowOccupancy = new Map([
			[0, [[1, 5], [20, 31]]],
		]);
		expect(findFreeRow(occ, 8, 15)).toBe(0); // gap [6,19] fits
	});
});

describe("newDatesFromDelta", () => {
	const start = new Date(2024, 2, 10); // Mar 10
	const end   = new Date(2024, 2, 20); // Mar 20

	describe("mode: move", () => {
		it("shifts both start and end by delta", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "move", 5);
			expect(newStart).toEqual(new Date(2024, 2, 15));
			expect(newEnd).toEqual(new Date(2024, 2, 25));
		});

		it("shifts backwards with negative delta", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "move", -3);
			expect(newStart).toEqual(new Date(2024, 2, 7));
			expect(newEnd).toEqual(new Date(2024, 2, 17));
		});

		it("returns unchanged dates for delta 0", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "move", 0);
			expect(newStart).toEqual(start);
			expect(newEnd).toEqual(end);
		});
	});

	describe("mode: resize-end", () => {
		it("extends end, keeps start", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-end", 5);
			expect(newStart).toEqual(start);
			expect(newEnd).toEqual(new Date(2024, 2, 25));
		});

		it("shrinks end, keeps start", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-end", -3);
			expect(newStart).toEqual(start);
			expect(newEnd).toEqual(new Date(2024, 2, 17));
		});

		it("clamps end to start when delta would push end before start", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-end", -100);
			expect(newEnd).toEqual(start);
			expect(newStart).toEqual(start);
		});
	});

	describe("mode: resize-start", () => {
		it("moves start earlier, keeps end", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-start", -5);
			expect(newStart).toEqual(new Date(2024, 2, 5));
			expect(newEnd).toEqual(end);
		});

		it("moves start later, keeps end", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-start", 3);
			expect(newStart).toEqual(new Date(2024, 2, 13));
			expect(newEnd).toEqual(end);
		});

		it("clamps start to end when delta would push start past end", () => {
			const { newStart, newEnd } = newDatesFromDelta(start, end, "resize-start", 100);
			expect(newStart).toEqual(end);
			expect(newEnd).toEqual(end);
		});
	});

	it("does not mutate input dates", () => {
		const s = new Date(2024, 2, 10);
		const e = new Date(2024, 2, 20);
		newDatesFromDelta(s, e, "move", 7);
		expect(s).toEqual(new Date(2024, 2, 10));
		expect(e).toEqual(new Date(2024, 2, 20));
	});
});
