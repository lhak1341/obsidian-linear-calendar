import { describe, it, expect } from "vitest";
import { UNCATEGORIZED, categoryOf, categoryLabel, visibleItems, countByCategory, itemsInMonths, toggleCategory } from "./category";
import type { CalendarItem } from "../types";

function item(tags?: string[]): CalendarItem {
	return { kind: "event", filePath: "n.md", title: "N", dateStart: new Date(2026, 0, 1), dateEnd: new Date(2026, 0, 1), tags };
}

describe("categoryOf", () => {
	it("is the first tag", () => expect(categoryOf(item(["linear-calendar/a", "linear-calendar/b"]))).toBe("linear-calendar/a"));
	it("is UNCATEGORIZED for empty or missing tags", () => {
		expect(categoryOf(item([]))).toBe(UNCATEGORIZED);
		expect(categoryOf(item(undefined))).toBe(UNCATEGORIZED);
	});
	it("keeps the persisted sentinel value", () => expect(UNCATEGORIZED).toBe("__uncategorized__"));
});

describe("categoryLabel", () => {
	it("labels the sentinel Other", () => expect(categoryLabel(UNCATEGORIZED)).toBe("Other"));
	it("strips the linear-calendar/ prefix", () => expect(categoryLabel("linear-calendar/work")).toBe("work"));
	it("leaves a bare tag alone", () => expect(categoryLabel("work")).toBe("work"));
});

describe("visibleItems", () => {
	const items = [item(["linear-calendar/a"]), item(["linear-calendar/b"]), item()];
	it("keeps everything when nothing is hidden", () => expect(visibleItems(items, new Set())).toHaveLength(3));
	it("hides uncategorized items via the sentinel", () => {
		const out = visibleItems(items, new Set([UNCATEGORIZED]));
		expect(out).toHaveLength(2);
		expect(out.every((i) => i.tags?.length)).toBe(true);
	});
	it("hides a real category", () => {
		const out = visibleItems(items, new Set(["linear-calendar/a"]));
		expect(out.map(categoryOf)).toEqual(["linear-calendar/b", UNCATEGORIZED]);
	});
});

describe("countByCategory", () => {
	it("counts per category in first-appearance order", () => {
		const counts = countByCategory([item(["linear-calendar/b"]), item(), item(["linear-calendar/b"]), item(["linear-calendar/a"])]);
		expect([...counts.entries()]).toEqual([["linear-calendar/b", 2], [UNCATEGORIZED, 1], ["linear-calendar/a", 1]]);
	});
	it("is empty for no items", () => expect(countByCategory([]).size).toBe(0));
});

describe("itemsInMonths", () => {
	function span(start: Date, end: Date): CalendarItem {
		return { ...item(), dateStart: start, dateEnd: end };
	}
	const inJan = span(new Date(2026, 0, 10), new Date(2026, 0, 12));
	const janToFeb = span(new Date(2026, 0, 30), new Date(2026, 1, 2));
	const inMar = span(new Date(2026, 2, 5), new Date(2026, 2, 5));
	const all = [inJan, janToFeb, inMar];

	it("returns everything for all 12 months", () => {
		expect(itemsInMonths(all, 2026, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toBe(all);
	});
	it("keeps items overlapping the month, including spans crossing in", () => {
		expect(itemsInMonths(all, 2026, [1])).toEqual([janToFeb]);
	});
	it("matches the last day of the month", () => {
		const lastDay = span(new Date(2026, 0, 31), new Date(2026, 0, 31));
		expect(itemsInMonths([lastDay], 2026, [0])).toEqual([lastDay]);
		expect(itemsInMonths([lastDay], 2026, [1])).toEqual([]);
	});
	it("handles a non-contiguous months list", () => {
		expect(itemsInMonths(all, 2026, [0, 2])).toEqual(all);
		expect(itemsInMonths(all, 2026, [3])).toEqual([]);
	});
});

describe("toggleCategory", () => {
	it("hides a shown category", () => {
		const hidden = new Set<string>();
		toggleCategory(hidden, "linear-calendar/a");
		expect([...hidden]).toEqual(["linear-calendar/a"]);
	});
	it("shows a hidden category and leaves the others", () => {
		const hidden = new Set(["linear-calendar/a", "linear-calendar/b"]);
		toggleCategory(hidden, "linear-calendar/a");
		expect([...hidden]).toEqual(["linear-calendar/b"]);
	});
});
