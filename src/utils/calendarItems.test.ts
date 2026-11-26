import { describe, it, expect } from "vitest";
import { expandForSpan, ageOn, describeItem } from "./calendarItems";
import type { RawCalendarItem } from "../types";

function raw(start: Date, end: Date, overrides: Partial<RawCalendarItem> = {}): RawCalendarItem {
	return { kind: "event", filePath: "n.md", title: "N", dateStart: start, dateEnd: end, ...overrides };
}

/** The year view's request: every item touching `year`. */
const inYear = (raws: RawCalendarItem[], year: number) => expandForSpan(raws, new Date(year, 0, 1), new Date(year, 11, 31));

describe("expandForSpan", () => {
	it("keeps a plain event in its own year as kind event", () => {
		const [item] = inYear([raw(new Date(2026, 4, 3), new Date(2026, 4, 3))], 2026);
		expect(item?.kind).toBe("event");
	});

	it("drops items outside the year", () => {
		expect(inYear([raw(new Date(2025, 4, 3), new Date(2025, 4, 3))], 2026)).toEqual([]);
		expect(inYear([raw(new Date(2027, 0, 1), new Date(2027, 0, 1))], 2026)).toEqual([]);
	});

	it("keeps the item's own span when it runs past both edges of the request", () => {
		const [item] = inYear([raw(new Date(2025, 11, 30), new Date(2027, 0, 2))], 2026);
		expect(item?.dateStart).toEqual(new Date(2025, 11, 30));
		expect(item?.dateEnd).toEqual(new Date(2027, 0, 2));
	});

	it("keeps an item starting on Dec 31 with a time of day", () => {
		const items = inYear([raw(new Date(2026, 11, 31, 10), new Date(2026, 11, 31, 10))], 2026);
		expect(items).toHaveLength(1);
	});

	it("returns an event across New Year once for a request across New Year", () => {
		const items = expandForSpan([raw(new Date(2026, 11, 30), new Date(2027, 0, 2))], new Date(2026, 11, 20), new Date(2027, 0, 18));
		expect(items).toHaveLength(1);
	});

	it("ignores the time of day at the request's edges", () => {
		const late = raw(new Date(2026, 10, 5, 23, 30), new Date(2026, 10, 5, 23, 30));
		expect(expandForSpan([late], new Date(2026, 10, 5, 23, 59), new Date(2026, 10, 6))).toHaveLength(1);
		expect(expandForSpan([late], new Date(2026, 10, 6), new Date(2026, 10, 7))).toEqual([]);
	});

	it("keeps an anniversary note in its origin year as kind event", () => {
		const [item] = inYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2020);
		expect(item?.kind).toBe("event");
	});

	it("projects an anniversary note into a later year as a recurrence with originYear", () => {
		const [item] = inYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2026);
		expect(item).toMatchObject({ kind: "recurrence", originYear: 2020, dateStart: new Date(2026, 7, 12) });
	});

	it("does not project into years before the origin", () => {
		expect(inYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2019)).toEqual([]);
	});

	it("preserves duration when projecting a multi-day anniversary", () => {
		const [item] = inYear([raw(new Date(2020, 2, 10), new Date(2020, 2, 12), { anniversary: true })], 2026);
		expect(item?.dateStart).toEqual(new Date(2026, 2, 10));
		expect(item?.dateEnd).toEqual(new Date(2026, 2, 12));
	});

	it("projects a leap-day origin into a non-leap year without throwing", () => {
		const [item] = inYear([raw(new Date(2020, 1, 29), new Date(2020, 1, 29), { anniversary: true })], 2026);
		expect(item?.kind).toBe("recurrence");
	});

	it("passes a reminder ghost through unprojected, even from an anniversary source", () => {
		const ghost = raw(new Date(2026, 11, 21), new Date(2026, 11, 21), { kind: "reminder", anniversary: true });
		expect(inYear([ghost], 2027)).toEqual([]);
		expect(inYear([ghost], 2026)[0]?.kind).toBe("reminder");
	});

	it("shows an anniversary's New Year tail in the next year, beside that year's own copy", () => {
		const note = raw(new Date(2025, 11, 30), new Date(2026, 0, 2), { anniversary: true });
		expect(inYear([note], 2026)).toMatchObject([
			{ kind: "event", dateStart: new Date(2025, 11, 30), dateEnd: new Date(2026, 0, 2) },
			{ kind: "recurrence", originYear: 2025, dateStart: new Date(2026, 11, 30), dateEnd: new Date(2027, 0, 2) },
		]);
		expect(inYear([note], 2027).map((i) => i.dateStart)).toEqual([new Date(2026, 11, 30), new Date(2027, 11, 30)]);
	});

	it("reaches a copy that a leap-day start pushes into the next year", () => {
		// 306 days from Feb 29 2024 lands on Dec 31; from its Mar 1 2025 copy it lands on Jan 1 2026.
		const note = raw(new Date(2024, 1, 29), new Date(2024, 11, 31), { anniversary: true });
		expect(inYear([note], 2026).map((i) => i.dateStart)).toEqual([new Date(2025, 2, 1), new Date(2026, 2, 1)]);
	});

	it("keeps a note's two yearly recurrences apart in a request over a year long", () => {
		const note = raw(new Date(2000, 11, 25), new Date(2000, 11, 25), { anniversary: true });
		const items = expandForSpan([note], new Date(2026, 11, 1), new Date(2028, 0, 4));
		expect(items.map((i) => i.dateStart)).toEqual([new Date(2026, 11, 25), new Date(2027, 11, 25)]);
	});

	it("strips the raw anniversary flag from the output", () => {
		const [item] = inYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2026);
		expect(item).not.toHaveProperty("anniversary");
	});
});

describe("ageOn", () => {
	it("is years since origin for a recurrence", () => {
		const [item] = inYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2026);
		expect(item && ageOn(item)).toBe(6);
	});

	it("is undefined for event and reminder", () => {
		const [event] = inYear([raw(new Date(2026, 7, 12), new Date(2026, 7, 12))], 2026);
		const [ghost] = inYear([raw(new Date(2026, 7, 12), new Date(2026, 7, 12), { kind: "reminder" })], 2026);
		expect(event && ageOn(event)).toBeUndefined();
		expect(ghost && ageOn(ghost)).toBeUndefined();
	});
});

describe("describeItem", () => {
	const BIRTHDAY = "linear-calendar/birthday";
	const first = (rawItem: RawCalendarItem, year: number) => {
		const [item] = inYear([rawItem], year);
		if (!item) throw new Error("item expected");
		return describeItem(item);
	};

	it("gives a single date for a one-day event", () => {
		expect(first(raw(new Date(2026, 4, 3), new Date(2026, 4, 3)), 2026).dates).toBe("2026-05-03");
	});

	it("gives start → end for a multi-day event", () => {
		expect(first(raw(new Date(2026, 4, 3), new Date(2026, 4, 5)), 2026).dates).toBe("2026-05-03 → 2026-05-05");
	});

	it("reports the note's own span, past the edges of the viewed year", () => {
		const d = first(raw(new Date(2025, 11, 30), new Date(2026, 0, 2)), 2026);
		expect(d.dates).toBe("2025-12-30 → 2026-01-02");
	});

	it("strips the category prefix from tag labels", () => {
		const d = first(raw(new Date(2026, 4, 3), new Date(2026, 4, 3), { tags: ["linear-calendar/work", "plain"] }), 2026);
		expect(d.tagLabels).toEqual(["work", "plain"]);
		expect(first(raw(new Date(2026, 4, 3), new Date(2026, 4, 3)), 2026).tagLabels).toEqual([]);
	});

	it("labels a birthday recurrence with its age", () => {
		const d = first(raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true, tags: ["other", BIRTHDAY] }), 2026);
		expect(d.ageLabel).toBe("Turns 6");
	});

	it("gives no age label to a non-birthday recurrence", () => {
		const d = first(raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true, tags: ["linear-calendar/work"] }), 2026);
		expect(d.ageLabel).toBeUndefined();
	});

	it("gives no age label to a birthday in its origin year", () => {
		const d = first(raw(new Date(2026, 7, 12), new Date(2026, 7, 12), { anniversary: true, tags: [BIRTHDAY] }), 2026);
		expect(d.ageLabel).toBeUndefined();
	});

	it("passes the description through, or leaves it undefined", () => {
		expect(first(raw(new Date(2026, 4, 3), new Date(2026, 4, 3), { description: "Hi" }), 2026).description).toBe("Hi");
		expect(first(raw(new Date(2026, 4, 3), new Date(2026, 4, 3)), 2026).description).toBeUndefined();
	});
});
