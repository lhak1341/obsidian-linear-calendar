import { describe, expect, it } from "vitest";
import type { CalendarItem } from "../types";
import { MAX_WATERFALL_COLS_VERT, MAX_WATERFALL_ROWS } from "../constants";
import { dayAt, resolveRange, windowEnd, type ViewRange } from "./viewRange";

const year = (y: number, alignMode: "date" | "weekday" = "date", layout: "horizontal" | "vertical" = "horizontal"): ViewRange =>
	({ kind: "year", year: y, layout, alignMode });
const nov6 = { start: new Date(2026, 10, 6), days: 30 };
const dec20 = { start: new Date(2026, 11, 20), days: 30 };
const win = (w: { start: Date; days: number }): ViewRange => ({ kind: "window", ...w });

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

describe("windowEnd", () => {
	it("is the last day inside", () => {
		expect(windowEnd(nov6)).toEqual(new Date(2026, 11, 5));
	});
});

describe("year rows", () => {
	it("has one row per month, labelled", () => {
		const { rows, layout } = resolveRange(year(2026));
		expect(layout).toBe("horizontal");
		expect(rows.map((r) => r.label).join(" ")).toBe("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec");
	});

	it("date-aligned: day N in column N-1, every month padded to 31 columns", () => {
		const feb = resolveRange(year(2026)).rows[1];
		expect(feb.columns).toBe(31);
		expect(feb.weekdayOffset).toBe(0);
		expect(feb.cells).toHaveLength(28);
		expect(feb.cells[0]).toEqual({ year: 2026, month: 1, day: 1, column: 0, weekday: 0, monthStart: false });
		expect(feb.emptyColumns).toEqual([28, 29, 30]);
	});

	it("gives a leap February 29 days", () => {
		const feb = resolveRange(year(2028)).rows[1];
		expect(feb.cells).toHaveLength(29);
		expect(feb.emptyColumns).toEqual([29, 30]);
	});

	it("weekday-aligned: day 1 sits under its weekday, columns fit the widest month, no padding", () => {
		const { rows } = resolveRange(year(2026, "weekday"));
		// Jan 1 2026 is a Thursday; Aug 2026 starts on a Saturday and has 31 days: 6 + 31.
		expect(rows[0].weekdayOffset).toBe(4);
		expect(rows[0].cells[0]).toMatchObject({ day: 1, column: 4, weekday: 4 });
		expect(rows.every((r) => r.columns === 37)).toBe(true);
		expect(rows.every((r) => r.emptyColumns.length === 0)).toBe(true);
	});

	it("vertical: no padding cells, even date-aligned", () => {
		const range = resolveRange(year(2026, "date", "vertical"));
		expect(range.layout).toBe("vertical");
		expect(range.rows[1].emptyColumns).toEqual([]);
	});

	it("never flags a month start inside a year", () => {
		expect(resolveRange(year(2026)).rows.flatMap((r) => r.cells).some((c) => c.monthStart)).toBe(false);
	});
});

describe("window rows", () => {
	it("is one row of consecutive days across the month end, labelled with the start month", () => {
		const [row, ...rest] = resolveRange(win(nov6)).rows;
		expect(rest).toEqual([]);
		expect(row.label).toBe("Nov");
		expect(row.columns).toBe(30);
		expect(row.cells).toHaveLength(30);
		expect(row.cells[24]).toMatchObject({ year: 2026, month: 10, day: 30, column: 24 });
		expect(row.cells[25]).toMatchObject({ year: 2026, month: 11, day: 1, column: 25, weekday: 2 });
	});

	it("flags the first of a month after the first column, and only there", () => {
		const cells = resolveRange(win(nov6)).rows[0].cells;
		expect(cells.filter((c) => c.monthStart).map((c) => c.column)).toEqual([25]);
		const startsOnFirst = resolveRange(win({ start: new Date(2026, 11, 1), days: 30 })).rows[0].cells;
		expect(startsOnFirst[0].monthStart).toBe(false);
	});

	it("crosses New Year", () => {
		expect(resolveRange(win(dec20)).rows[0].cells[12]).toMatchObject({ year: 2027, month: 0, day: 1, monthStart: true });
	});
});

describe("locate", () => {
	it("year, date-aligned: the month's row, day - 1, ignoring the time of day", () => {
		expect(resolveRange(year(2026)).locate(new Date(2026, 2, 5, 23, 59))).toEqual({ row: 2, column: 4 });
	});

	it("year, weekday-aligned: shifted by the month's weekday offset", () => {
		expect(resolveRange(year(2026, "weekday")).locate(new Date(2026, 0, 1))).toEqual({ row: 0, column: 4 });
	});

	it("year: null for another year", () => {
		expect(resolveRange(year(2026)).locate(new Date(2027, 0, 1))).toBeNull();
	});

	it("window: counts from zero and ignores the time of day", () => {
		const range = resolveRange(win(nov6));
		expect(range.locate(new Date(2026, 10, 6, 23, 59))).toEqual({ row: 0, column: 0 });
		expect(range.locate(new Date(2026, 11, 5))).toEqual({ row: 0, column: 29 });
	});

	it("window: null outside", () => {
		const range = resolveRange(win(nov6));
		expect(range.locate(new Date(2026, 10, 5))).toBeNull();
		expect(range.locate(new Date(2026, 11, 6))).toBeNull();
	});

	it("window: finds a day past New Year", () => {
		expect(resolveRange(win(dec20)).locate(new Date(2027, 0, 1))).toEqual({ row: 0, column: 12 });
	});
});

describe("first and last", () => {
	it("year: Jan 1 to Dec 31", () => {
		const range = resolveRange(year(2026));
		expect([range.first, range.last]).toEqual([new Date(2026, 0, 1), new Date(2026, 11, 31)]);
	});

	it("window: its start to its last day, across New Year, at midnight", () => {
		const range = resolveRange(win({ start: new Date(2026, 11, 20, 15, 30), days: 30 }));
		expect([range.first, range.last]).toEqual([new Date(2026, 11, 20), new Date(2027, 0, 18)]);
	});
});

describe("layoutBars", () => {
	const stack = (n: number, at: Date) => Array.from({ length: n }, (_, i) => event(String(i), at));

	it("year: one row per month, lanes capped by layout", () => {
		const at = new Date(2026, 3, 10);
		expect(resolveRange(year(2026)).layoutBars(stack(10, at)).placementsFor(3)).toHaveLength(MAX_WATERFALL_ROWS);
		expect(resolveRange(year(2026, "date", "vertical")).layoutBars(stack(10, at)).placementsFor(3)).toHaveLength(MAX_WATERFALL_COLS_VERT);
	});

	it("year: clips a span begun last year to January's first day", () => {
		const [placement] = resolveRange(year(2026)).layoutBars([event("a", new Date(2025, 11, 30), new Date(2026, 0, 3))]).placementsFor(0);
		expect(placement?.segment).toMatchObject({ row: 0, startDay: 1, endDay: 3 });
	});

	it("window: places a bar by its column, using 1-based days", () => {
		const [placement] = resolveRange(win(nov6)).layoutBars([event("a", new Date(2026, 10, 8))]).placementsFor(0);
		expect(placement?.segment).toMatchObject({ row: 0, startDay: 3, endDay: 3 });
	});

	it("window: uses the same row across the month end", () => {
		const [placement] = resolveRange(win(nov6)).layoutBars([event("a", new Date(2026, 11, 1))]).placementsFor(0);
		expect(placement?.segment.startDay).toBe(26);
	});

	it("window: clips a bar running past either edge", () => {
		const [placement] = resolveRange(win(nov6)).layoutBars([event("a", new Date(2026, 9, 1), new Date(2027, 0, 1))]).placementsFor(0);
		expect(placement?.segment).toMatchObject({ startDay: 1, endDay: 30 });
	});

	it("window: places an across-New-Year event across it", () => {
		const item = event("trip", new Date(2026, 11, 30), new Date(2027, 0, 2));
		const [placement] = resolveRange(win(dec20)).layoutBars([item]).placementsFor(0);
		expect(placement?.segment).toMatchObject({ startDay: 11, endDay: 14 });
	});

	it("window: stacks overlapping bars into lanes and drops those past the cap", () => {
		const placements = resolveRange(win(nov6)).layoutBars(stack(10, new Date(2026, 10, 8))).placementsFor(0);
		expect(placements.map((p) => p.lane)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});

	it("window: has nothing for any other row", () => {
		expect(resolveRange(win(nov6)).layoutBars([event("a", new Date(2026, 10, 8))]).placementsFor(1)).toEqual([]);
	});

	describe("window previewMove", () => {
		const layout = resolveRange(win(nov6)).layoutBars([]);

		it("moves the home slice and never makes a ghost", () => {
			expect(layout.previewMove(0, new Date(2026, 10, 10), new Date(2026, 10, 12))).toEqual({
				home: { row: 0, startDay: 5, endDay: 7 },
				ghosts: [],
			});
		});

		it("has no home slice once dragged out of the window", () => {
			expect(layout.previewMove(0, new Date(2027, 0, 1), new Date(2027, 0, 1)).home).toBeNull();
		});
	});
});
