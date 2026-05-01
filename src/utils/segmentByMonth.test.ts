import { describe, it, expect } from "vitest";
import { segmentByMonth, groupSegmentsByMonth } from "./segmentByMonth";
import type { CalendarItem } from "../types";

function item(startStr: string, endStr: string): CalendarItem {
	return {
		filePath: "test.md",
		title: "Test",
		dateStart: new Date(startStr),
		dateEnd: new Date(endStr),
	};
}

describe("segmentByMonth", () => {
	it("single-day event = one segment", () => {
		const segs = segmentByMonth(item("2024-03-15", "2024-03-15"));
		expect(segs).toHaveLength(1);
		expect(segs[0]).toMatchObject({ month: 2, startDay: 15, endDay: 15 });
	});

	it("same-month span = one segment", () => {
		const segs = segmentByMonth(item("2024-03-10", "2024-03-25"));
		expect(segs).toHaveLength(1);
		expect(segs[0]).toMatchObject({ month: 2, startDay: 10, endDay: 25 });
	});

	it("two-month span = two segments", () => {
		const segs = segmentByMonth(item("2024-01-15", "2024-02-10"));
		expect(segs).toHaveLength(2);
		expect(segs[0]).toMatchObject({ month: 0, startDay: 15, endDay: 31 });
		expect(segs[1]).toMatchObject({ month: 1, startDay: 1, endDay: 10 });
	});

	it("three-month span fills middle month completely", () => {
		const segs = segmentByMonth(item("2024-01-15", "2024-03-10"));
		expect(segs).toHaveLength(3);
		// Feb 2024 is leap: 29 days
		expect(segs[1]).toMatchObject({ month: 1, startDay: 1, endDay: 29 });
		expect(segs[2]).toMatchObject({ month: 2, startDay: 1, endDay: 10 });
	});

	it("year-spanning event segments correctly", () => {
		const segs = segmentByMonth(item("2023-12-20", "2024-01-05"));
		expect(segs).toHaveLength(2);
		expect(segs[0]).toMatchObject({ month: 11, startDay: 20, endDay: 31 });
		expect(segs[1]).toMatchObject({ month: 0, startDay: 1, endDay: 5 });
	});

	it("each segment references original item", () => {
		const src = item("2024-01-01", "2024-02-28");
		const segs = segmentByMonth(src);
		segs.forEach((s) => expect(s.item).toBe(src));
	});
});

describe("groupSegmentsByMonth", () => {
	it("returns map with 12 month keys", () => {
		const map = groupSegmentsByMonth([]);
		expect(map.size).toBe(12);
	});

	it("places segments into correct month buckets", () => {
		const items = [item("2024-01-10", "2024-01-20"), item("2024-03-01", "2024-03-31")];
		const map = groupSegmentsByMonth(items);
		expect(map.get(0)!).toHaveLength(1);
		expect(map.get(2)!).toHaveLength(1);
		expect(map.get(1)!).toHaveLength(0);
	});

	it("multi-month item appears in multiple buckets", () => {
		const map = groupSegmentsByMonth([item("2024-01-15", "2024-03-10")]);
		expect(map.get(0)!).toHaveLength(1);
		expect(map.get(1)!).toHaveLength(1);
		expect(map.get(2)!).toHaveLength(1);
		expect(map.get(3)!).toHaveLength(0);
	});
});
