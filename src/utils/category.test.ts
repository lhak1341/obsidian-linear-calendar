import { describe, it, expect } from "vitest";
import { UNCATEGORIZED, categoryOf, categoryLabel, visibleItems, countByCategory } from "./category";
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
