import { describe, it, expect } from "vitest";
import { coerceTags, resolveCalendarTags } from "./frontmatterUtils";

describe("resolveCalendarTags", () => {
	it("strips the bare gate tag and any subtag, then puts the resolved tag first", () => {
		expect(resolveCalendarTags(["linear-calendar", "linear-calendar/work", "other"], "linear-calendar/home"))
			.toEqual(["linear-calendar/home", "other"]);
	});

	it("returns just the resolved tag when there are no existing tags", () => {
		expect(resolveCalendarTags(undefined, "linear-calendar/work")).toEqual(["linear-calendar/work"]);
	});

	it("coerces a single string or number tags value", () => {
		expect(resolveCalendarTags("linear-calendar", "linear-calendar/work")).toEqual(["linear-calendar/work"]);
		expect(resolveCalendarTags(42, undefined)).toEqual(["linear-calendar", "42"]);
	});

	it("falls back to the bare gate tag when tag is omitted or blank", () => {
		expect(resolveCalendarTags([], undefined)).toEqual(["linear-calendar"]);
		expect(resolveCalendarTags([], "   ")).toEqual(["linear-calendar"]);
	});
});

describe("coerceTags", () => {
	it("passes an array through as strings", () => expect(coerceTags(["a", 1])).toEqual(["a", "1"]));
	it("wraps a single string or number", () => {
		expect(coerceTags("linear-calendar")).toEqual(["linear-calendar"]);
		expect(coerceTags(42)).toEqual(["42"]);
	});
	it("returns an empty list for anything else", () => {
		expect(coerceTags(undefined)).toEqual([]);
		expect(coerceTags(null)).toEqual([]);
		expect(coerceTags({ a: 1 })).toEqual([]);
	});
});
