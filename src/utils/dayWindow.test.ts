import { describe, expect, it } from "vitest";
import type { CalendarItem } from "../types";
import { dayAt, itemsInWindow, layoutWindow, windowColumn, windowDays, windowEnd, WINDOW_ROW } from "./dayWindow";

const nov6 = { start: new Date(2026, 10, 6), days: 30 };
const dec20 = { start: new Date(2026, 11, 20), days: 30 };

function event(filePath: string, dateStart: Date, dateEnd = dateStart, extra: Partial<CalendarItem> = {}): CalendarItem {
	return { kind: "event", title: filePath, filePath, dateStart, dateEnd, ...extra } as CalendarItem;
}

describe("dayAt", () => {
	it("crosses a month and a year", () => {
		expect(dayAt(new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 1));
	});

	it("drops the time of day", () => {
		expect(dayAt(new Date(2026, 10, 6, 23, 30), 0)).toEqual(new Date(2026, 10, 6));
	});
});

describe("windowDays", () => {
	it("runs from the start across the month end", () => {
		const days = windowDays(nov6);
		expect(days).toHaveLength(30);
		expect(days[0]).toEqual({ year: 2026, month: 10, day: 6 });
		expect(days[24]).toEqual({ year: 2026, month: 10, day: 30 });
		expect(days[25]).toEqual({ year: 2026, month: 11, day: 1 });
		expect(days[29]).toEqual({ year: 2026, month: 11, day: 5 });
	});

	it("crosses New Year", () => {
		expect(windowDays(dec20)[12]).toEqual({ year: 2027, month: 0, day: 1 });
	});
});

describe("windowEnd", () => {
	it("is the last day inside", () => {
		expect(windowEnd(nov6)).toEqual(new Date(2026, 11, 5));
	});
});

describe("windowColumn", () => {
	it("counts from zero and ignores the time of day", () => {
		expect(windowColumn(nov6, new Date(2026, 10, 6, 23, 59))).toBe(0);
		expect(windowColumn(nov6, new Date(2026, 11, 5))).toBe(29);
	});

	it("is null outside the window", () => {
		expect(windowColumn(nov6, new Date(2026, 10, 5))).toBeNull();
		expect(windowColumn(nov6, new Date(2026, 11, 6))).toBeNull();
	});
});

describe("itemsInWindow", () => {
	it("keeps only items touching the window", () => {
		const inside = event("in", new Date(2026, 10, 8));
		const before = event("before", new Date(2026, 10, 5));
		const after = event("after", new Date(2026, 11, 6));
		const overlapping = event("over", new Date(2026, 10, 1), new Date(2026, 10, 6));
		expect(itemsInWindow(nov6, () => [inside, before, after, overlapping])).toEqual([inside, overlapping]);
	});

	it("asks for one year when the window stays inside it", () => {
		const years: number[] = [];
		itemsInWindow(nov6, (y) => { years.push(y); return []; });
		expect(years).toEqual([2026]);
	});

	it("asks for both years when the window crosses New Year", () => {
		const years: number[] = [];
		itemsInWindow(dec20, (y) => { years.push(y); return []; });
		expect(years).toEqual([2026, 2027]);
	});

	it("returns an event across New Year once, though each year's scan clamps its own copy", () => {
		const fullStart = new Date(2026, 11, 30);
		const fullEnd = new Date(2027, 0, 2);
		const scan = (year: number) => [
			year === 2026
				? event("trip", fullStart, new Date(2026, 11, 31), { fullStart, fullEnd })
				: event("trip", new Date(2027, 0, 1), fullEnd, { fullStart, fullEnd }),
		];
		expect(itemsInWindow(dec20, scan)).toHaveLength(1);
	});

	it("keeps a note's two yearly recurrences apart", () => {
		const first = new Date(2026, 11, 25);
		const second = new Date(2027, 11, 25);
		const wide = { start: new Date(2026, 11, 1), days: 400 };
		const scan = (year: number) => [event("birthday", year === 2026 ? first : second, undefined, { kind: "recurrence", originYear: 2000 } as Partial<CalendarItem>)];
		expect(itemsInWindow(wide, scan)).toHaveLength(2);
	});
});

describe("layoutWindow", () => {
	it("places a bar by its window column, using 1-based days", () => {
		const [placement] = layoutWindow([event("a", new Date(2026, 10, 8))], nov6, 3).placementsFor(WINDOW_ROW);
		expect(placement?.segment).toMatchObject({ startDay: 3, endDay: 3 });
	});

	it("uses the same column across the month end", () => {
		const [placement] = layoutWindow([event("a", new Date(2026, 11, 1))], nov6, 3).placementsFor(WINDOW_ROW);
		expect(placement?.segment.startDay).toBe(26);
	});

	it("clips a bar running past either edge", () => {
		const [placement] = layoutWindow([event("a", new Date(2026, 9, 1), new Date(2027, 0, 1))], nov6, 3).placementsFor(WINDOW_ROW);
		expect(placement?.segment).toMatchObject({ startDay: 1, endDay: 30 });
	});

	it("measures an across-New-Year event by its full span, not its clamped copy", () => {
		const fullStart = new Date(2026, 11, 30);
		const fullEnd = new Date(2027, 0, 2);
		const item = event("trip", fullStart, new Date(2026, 11, 31), { fullStart, fullEnd });
		const [placement] = layoutWindow([item], dec20, 3).placementsFor(WINDOW_ROW);
		expect(placement?.segment).toMatchObject({ startDay: 11, endDay: 14 });
	});

	it("stacks overlapping bars and drops those past the row limit", () => {
		const items = ["a", "b", "c"].map((name) => event(name, new Date(2026, 10, 8)));
		const placements = layoutWindow(items, nov6, 2).placementsFor(WINDOW_ROW);
		expect(placements.map((p) => p.row)).toEqual([0, 1]);
	});

	it("has nothing for any other row", () => {
		expect(layoutWindow([event("a", new Date(2026, 10, 8))], nov6, 3).placementsFor(WINDOW_ROW + 1)).toEqual([]);
	});

	describe("previewMove", () => {
		const layout = layoutWindow([], nov6, 3);

		it("moves the home slice and never makes a ghost", () => {
			expect(layout.previewMove(WINDOW_ROW, new Date(2026, 10, 10), new Date(2026, 10, 12))).toEqual({
				home: { month: WINDOW_ROW, startDay: 5, endDay: 7 },
				ghosts: [],
			});
		});

		it("has no home slice once dragged out of the window", () => {
			expect(layout.previewMove(WINDOW_ROW, new Date(2027, 0, 1), new Date(2027, 0, 1)).home).toBeNull();
		});
	});
});
