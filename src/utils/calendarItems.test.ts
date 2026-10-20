import { describe, it, expect } from "vitest";
import { expandForYear, ageOn, describeItem } from "./calendarItems";
import type { RawCalendarItem } from "../types";

function raw(start: Date, end: Date, overrides: Partial<RawCalendarItem> = {}): RawCalendarItem {
	return { kind: "event", filePath: "n.md", title: "N", dateStart: start, dateEnd: end, ...overrides };
}

describe("expandForYear", () => {
	it("keeps a plain event in its own year as kind event", () => {
		const [item] = expandForYear([raw(new Date(2026, 4, 3), new Date(2026, 4, 3))], 2026);
		expect(item?.kind).toBe("event");
	});

	it("drops items outside the year", () => {
		expect(expandForYear([raw(new Date(2025, 4, 3), new Date(2025, 4, 3))], 2026)).toEqual([]);
		expect(expandForYear([raw(new Date(2027, 0, 1), new Date(2027, 0, 1))], 2026)).toEqual([]);
	});

	it("clamps a span crossing the year edges", () => {
		const [item] = expandForYear([raw(new Date(2025, 11, 30), new Date(2027, 0, 2))], 2026);
		expect(item?.dateStart).toEqual(new Date(2026, 0, 1));
		expect(item?.dateEnd).toEqual(new Date(2026, 11, 31));
	});

	it("keeps an item starting on Dec 31 with a time of day", () => {
		const items = expandForYear([raw(new Date(2026, 11, 31, 10), new Date(2026, 11, 31, 10))], 2026);
		expect(items).toHaveLength(1);
	});

	it("keeps the unclamped span as fullStart/fullEnd", () => {
		const [item] = expandForYear([raw(new Date(2025, 11, 30), new Date(2027, 0, 2))], 2026);
		expect(item?.fullStart).toEqual(new Date(2025, 11, 30));
		expect(item?.fullEnd).toEqual(new Date(2027, 0, 2));
	});

	it("keeps an anniversary note in its origin year as kind event", () => {
		const [item] = expandForYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2020);
		expect(item?.kind).toBe("event");
	});

	it("projects an anniversary note into a later year as a recurrence with originYear", () => {
		const [item] = expandForYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2026);
		expect(item).toMatchObject({ kind: "recurrence", originYear: 2020, dateStart: new Date(2026, 7, 12) });
	});

	it("does not project into years before the origin", () => {
		expect(expandForYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2019)).toEqual([]);
	});

	it("preserves duration when projecting a multi-day anniversary", () => {
		const [item] = expandForYear([raw(new Date(2020, 2, 10), new Date(2020, 2, 12), { anniversary: true })], 2026);
		expect(item?.dateStart).toEqual(new Date(2026, 2, 10));
		expect(item?.dateEnd).toEqual(new Date(2026, 2, 12));
	});

	it("projects a leap-day origin into a non-leap year without throwing", () => {
		const [item] = expandForYear([raw(new Date(2020, 1, 29), new Date(2020, 1, 29), { anniversary: true })], 2026);
		expect(item?.kind).toBe("recurrence");
	});

	it("passes a reminder ghost through unprojected, even from an anniversary source", () => {
		const ghost = raw(new Date(2026, 11, 21), new Date(2026, 11, 21), { kind: "reminder", anniversary: true });
		expect(expandForYear([ghost], 2027)).toEqual([]);
		expect(expandForYear([ghost], 2026)[0]?.kind).toBe("reminder");
	});

	it("strips the raw anniversary flag from the output", () => {
		const [item] = expandForYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2026);
		expect(item).not.toHaveProperty("anniversary");
	});
});

describe("ageOn", () => {
	it("is years since origin for a recurrence", () => {
		const [item] = expandForYear([raw(new Date(2020, 7, 12), new Date(2020, 7, 12), { anniversary: true })], 2026);
		expect(item && ageOn(item)).toBe(6);
	});

	it("is undefined for event and reminder", () => {
		const [event] = expandForYear([raw(new Date(2026, 7, 12), new Date(2026, 7, 12))], 2026);
		const [ghost] = expandForYear([raw(new Date(2026, 7, 12), new Date(2026, 7, 12), { kind: "reminder" })], 2026);
		expect(event && ageOn(event)).toBeUndefined();
		expect(ghost && ageOn(ghost)).toBeUndefined();
	});
});

describe("describeItem", () => {
	const BIRTHDAY = "linear-calendar/birthday";
	const first = (rawItem: RawCalendarItem, year: number) => {
		const [item] = expandForYear([rawItem], year);
		if (!item) throw new Error("item expected");
		return describeItem(item);
	};

	it("gives a single date for a one-day event", () => {
		expect(first(raw(new Date(2026, 4, 3), new Date(2026, 4, 3)), 2026).dates).toBe("2026-05-03");
	});

	it("gives start → end for a multi-day event", () => {
		expect(first(raw(new Date(2026, 4, 3), new Date(2026, 4, 5)), 2026).dates).toBe("2026-05-03 → 2026-05-05");
	});

	it("reports the note's own span, not the span clamped to the viewed year", () => {
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
