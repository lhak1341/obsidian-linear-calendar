import { describe, it, expect } from "vitest";
import { gridArea, layoutBars, splitByMonth } from "./barLayout";
import type { CalendarItem } from "../types";

function item(start: Date, end: Date, title = "T"): CalendarItem {
	return { kind: "event", filePath: `${title}.md`, title, dateStart: start, dateEnd: end };
}

/** An item inside January 2024, days `a`..`b`. */
const jan = (a: number, b: number, title = "T") => item(new Date(2024, 0, a), new Date(2024, 0, b), title);

describe("splitByMonth", () => {
	it("returns a single span when start and end are in the same month", () => {
		expect(splitByMonth(new Date(2024, 3, 5), new Date(2024, 3, 20), 2024)).toEqual([{ month: 3, startDay: 5, endDay: 20 }]);
	});

	it("fills the months between with whole months", () => {
		expect(splitByMonth(new Date(2024, 1, 20), new Date(2024, 3, 10), 2024)).toEqual([
			{ month: 1, startDay: 20, endDay: 29 }, // Feb 2024 has 29 days
			{ month: 2, startDay: 1, endDay: 31 },
			{ month: 3, startDay: 1, endDay: 10 },
		]);
	});

	it("uses 28 days for February in a non-leap year", () => {
		expect(splitByMonth(new Date(2023, 1, 15), new Date(2023, 2, 5), 2023)).toEqual([
			{ month: 1, startDay: 15, endDay: 28 },
			{ month: 2, startDay: 1, endDay: 5 },
		]);
	});

	it("clips a start before the year to Jan 1", () => {
		const spans = splitByMonth(new Date(2023, 10, 1), new Date(2024, 1, 15), 2024);
		expect(spans[0]).toEqual({ month: 0, startDay: 1, endDay: 31 });
		expect(spans[1]).toEqual({ month: 1, startDay: 1, endDay: 15 });
	});

	it("clips an end after the year to Dec 31", () => {
		const spans = splitByMonth(new Date(2024, 10, 10), new Date(2025, 2, 1), 2024);
		expect(spans[spans.length - 1]).toEqual({ month: 11, startDay: 1, endDay: 31 });
	});

	it("returns nothing for a span entirely outside the year", () => {
		expect(splitByMonth(new Date(2023, 0, 1), new Date(2023, 11, 31), 2024)).toEqual([]);
		expect(splitByMonth(new Date(2025, 0, 1), new Date(2025, 5, 1), 2024)).toEqual([]);
	});

	it("returns nothing when the end is before the start", () => {
		expect(splitByMonth(new Date(2024, 2, 10), new Date(2024, 1, 5), 2024)).toEqual([]);
		expect(splitByMonth(new Date(2024, 2, 10), new Date(2024, 2, 5), 2024)).toEqual([]);
	});

	it("covers all twelve months for a full-year span", () => {
		const spans = splitByMonth(new Date(2024, 0, 1), new Date(2024, 11, 31), 2024);
		expect(spans).toHaveLength(12);
		expect(spans[11]).toEqual({ month: 11, startDay: 1, endDay: 31 });
	});

	it("keeps a single-day span at the year's edges when the dates carry a time of day", () => {
		expect(splitByMonth(new Date(2024, 11, 31, 15, 30), new Date(2024, 11, 31, 15, 30), 2024))
			.toEqual([{ month: 11, startDay: 31, endDay: 31 }]);
		expect(splitByMonth(new Date(2024, 0, 1, 9), new Date(2024, 0, 1, 9), 2024))
			.toEqual([{ month: 0, startDay: 1, endDay: 1 }]);
	});

	it("keeps a Dec 31 start whose end was clamped below it", () => {
		// expandForYear clamps dateEnd to Dec 31 00:00 even when dateStart carries a time of day
		expect(splitByMonth(new Date(2024, 11, 31, 12), new Date(2024, 11, 31), 2024))
			.toEqual([{ month: 11, startDay: 31, endDay: 31 }]);
	});
});

describe("layoutBars: placements", () => {
	it("is empty for a month with no items", () => {
		expect(layoutBars([], 2024, 8).placementsFor(0)).toEqual([]);
	});

	it("puts a single bar in row 0", () => {
		const [a] = layoutBars([jan(1, 10)], 2024, 8).placementsFor(0);
		expect(a.row).toBe(0);
	});

	it("gives a multi-month item one segment per month, all pointing at the item", () => {
		const src = item(new Date(2024, 0, 15), new Date(2024, 2, 10));
		const layout = layoutBars([src], 2024, 8);
		expect(layout.placementsFor(0)[0].segment).toMatchObject({ month: 0, startDay: 15, endDay: 31 });
		expect(layout.placementsFor(1)[0].segment).toMatchObject({ month: 1, startDay: 1, endDay: 29 });
		expect(layout.placementsFor(2)[0].segment).toMatchObject({ month: 2, startDay: 1, endDay: 10 });
		expect(layout.placementsFor(3)).toEqual([]);
		for (const m of [0, 1, 2]) expect(layout.placementsFor(m)[0].segment.item).toBe(src);
	});

	it("lets two bars share a row when there is a gap day between them", () => {
		const rows = layoutBars([jan(1, 9), jan(10, 20)], 2024, 8).placementsFor(0).map((p) => p.row);
		expect(rows).toEqual([0, 0]);
	});

	it("sends same-day adjacency to a new row", () => {
		const rows = layoutBars([jan(1, 10), jan(10, 20)], 2024, 8).placementsFor(0).map((p) => p.row);
		expect(rows).toEqual([0, 1]);
	});

	it("stacks fully overlapping bars into rows 0 and 1", () => {
		const rows = layoutBars([jan(1, 31, "a"), jan(1, 31, "b")], 2024, 8).placementsFor(0).map((p) => p.row);
		expect(rows).toEqual([0, 1]);
	});

	it("packs greedily into the earliest free row, whatever order the items arrive in", () => {
		const a = jan(1, 10, "a");
		const b = jan(1, 10, "b");
		const c = jan(11, 20, "c");
		const rowOf = (title: string) =>
			layoutBars([c, a, b], 2024, 8).placementsFor(0).find((p) => p.segment.item.title === title)?.row;
		expect(rowOf("a")).toBe(0);
		expect(rowOf("b")).toBe(1);
		expect(rowOf("c")).toBe(0);
	});

	it("drops bars that would need more than maxRows rows", () => {
		const placements = layoutBars([jan(1, 31, "a"), jan(1, 31, "b"), jan(1, 31, "c")], 2024, 2).placementsFor(0);
		expect(placements.map((p) => p.row)).toEqual([0, 1]);
	});

	it("drops everything when maxRows is 0", () => {
		expect(layoutBars([jan(1, 10)], 2024, 0).placementsFor(0)).toEqual([]);
	});
});

describe("layoutBars: previewMove", () => {
	const feb = (a: number, b: number, title = "T") => item(new Date(2024, 1, a), new Date(2024, 1, b), title);

	it("returns the home slice and no ghosts for a move inside the home month", () => {
		const layout = layoutBars([jan(5, 10)], 2024, 8);
		expect(layout.previewMove(0, new Date(2024, 0, 8), new Date(2024, 0, 13)))
			.toEqual({ home: { month: 0, startDay: 8, endDay: 13 }, ghosts: [] });
	});

	it("puts ghosts for the other months in the first free row", () => {
		const layout = layoutBars([jan(20, 25), feb(1, 29, "busy")], 2024, 8);
		const { home, ghosts } = layout.previewMove(0, new Date(2024, 0, 28), new Date(2024, 1, 5));
		expect(home).toEqual({ month: 0, startDay: 28, endDay: 31 });
		expect(ghosts).toEqual([{ month: 1, startDay: 1, endDay: 5, row: 1 }]); // row 0 is taken by "busy"
	});

	it("reports no home slice when the new dates leave the home month", () => {
		const layout = layoutBars([jan(5, 10)], 2024, 8);
		const { home, ghosts } = layout.previewMove(0, new Date(2024, 1, 5), new Date(2024, 1, 8));
		expect(home).toBeNull();
		expect(ghosts).toEqual([{ month: 1, startDay: 5, endDay: 8, row: 0 }]);
	});

	it("treats a shared end day as an overlap", () => {
		const layout = layoutBars([feb(1, 10)], 2024, 8);
		const { ghosts } = layout.previewMove(0, new Date(2024, 1, 10), new Date(2024, 1, 20));
		expect(ghosts[0].row).toBe(1);
	});

	it("treats a ghost ending on the day a bar starts as an overlap", () => {
		const layout = layoutBars([feb(10, 20)], 2024, 8);
		const { ghosts } = layout.previewMove(0, new Date(2024, 1, 1), new Date(2024, 1, 10));
		expect(ghosts[0].row).toBe(1);
	});

	it("treats strictly adjacent days as no overlap", () => {
		const layout = layoutBars([feb(1, 9)], 2024, 8);
		const { ghosts } = layout.previewMove(0, new Date(2024, 1, 10), new Date(2024, 1, 20));
		expect(ghosts[0].row).toBe(0);
	});

	it("fits a ghost into a gap between bars in the same row", () => {
		const layout = layoutBars([feb(1, 5, "a"), feb(20, 29, "b")], 2024, 8);
		const { ghosts } = layout.previewMove(0, new Date(2024, 1, 8), new Date(2024, 1, 15));
		expect(ghosts[0].row).toBe(0);
	});

	it("omits a ghost when every row under the cap is taken", () => {
		const layout = layoutBars([feb(1, 29, "a"), feb(1, 29, "b")], 2024, 2);
		const { home, ghosts } = layout.previewMove(0, new Date(2024, 0, 30), new Date(2024, 1, 3));
		expect(home).toEqual({ month: 0, startDay: 30, endDay: 31 });
		expect(ghosts).toEqual([]);
	});

	it("clips the preview to the layout's year", () => {
		const layout = layoutBars([], 2024, 8);
		expect(layout.previewMove(11, new Date(2024, 11, 30), new Date(2025, 0, 3)))
			.toEqual({ home: { month: 11, startDay: 30, endDay: 31 }, ghosts: [] });
	});
});

describe("gridArea", () => {
	it("horizontal: days along columns offset by the weekday, rows below the header", () => {
		expect(gridArea({ month: 0, startDay: 5, endDay: 10 }, 2, 2, "horizontal"))
			.toEqual({ gridColumn: "7 / span 6", gridRow: "4" });
	});

	it("vertical: days down rows, bars in columns after the date column", () => {
		expect(gridArea({ month: 0, startDay: 5, endDay: 10 }, 1, 0, "vertical"))
			.toEqual({ gridColumn: "3", gridRow: "5 / span 6" });
	});

	it("a single day spans 1", () => {
		expect(gridArea({ month: 0, startDay: 15, endDay: 15 }, 0, 0, "horizontal").gridColumn).toBe("15 / span 1");
	});
});
