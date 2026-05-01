import { describe, it, expect } from "vitest";
import {
	dayOfYear,
	daysInYear,
	isLeapYear,
	dateFromDayOfYear,
	formatDateRange,
	parseDateString,
	monthBoundaries,
} from "./dateUtils";

describe("isLeapYear", () => {
	it("divisible by 4 is leap", () => expect(isLeapYear(2024)).toBe(true));
	it("century year is not leap", () => expect(isLeapYear(1900)).toBe(false));
	it("400-year multiple is leap", () => expect(isLeapYear(2000)).toBe(true));
	it("common year", () => expect(isLeapYear(2023)).toBe(false));
});

describe("daysInYear", () => {
	it("leap year = 366", () => expect(daysInYear(2024)).toBe(366));
	it("common year = 365", () => expect(daysInYear(2023)).toBe(365));
});

describe("dayOfYear", () => {
	it("Jan 1 = 1", () => expect(dayOfYear(new Date(2024, 0, 1))).toBe(1));
	it("Dec 31 non-leap = 365", () => expect(dayOfYear(new Date(2023, 11, 31))).toBe(365));
	it("Dec 31 leap = 366", () => expect(dayOfYear(new Date(2024, 11, 31))).toBe(366));
	it("Feb 28 common year = 59", () => expect(dayOfYear(new Date(2023, 1, 28))).toBe(59));
	it("Mar 1 common year = 60", () => expect(dayOfYear(new Date(2023, 2, 1))).toBe(60));
	it("Mar 1 leap year = 61", () => expect(dayOfYear(new Date(2024, 2, 1))).toBe(61));
});

describe("dateFromDayOfYear", () => {
	it("day 1 = Jan 1", () => {
		const d = dateFromDayOfYear(1, 2024);
		expect(d.getMonth()).toBe(0);
		expect(d.getDate()).toBe(1);
	});
	it("round-trips with dayOfYear", () => {
		const day = 200;
		expect(dayOfYear(dateFromDayOfYear(day, 2023))).toBe(day);
	});
});

describe("formatDateRange", () => {
	it("same date returns single date", () => {
		const d = new Date(2024, 0, 15);
		expect(formatDateRange(d, d)).toBe("2024-01-15");
	});
	it("range returns arrow-separated", () => {
		expect(formatDateRange(new Date(2024, 0, 1), new Date(2024, 2, 31))).toBe(
			"2024-01-01 → 2024-03-31",
		);
	});
	it("pads single-digit month and day", () => {
		expect(formatDateRange(new Date(2024, 1, 5), new Date(2024, 1, 5))).toBe("2024-02-05");
	});
});

describe("parseDateString", () => {
	it("parses YYYY-MM-DD in local time", () => {
		const d = parseDateString("2024-06-15");
		expect(d).not.toBeNull();
		expect(d!.getFullYear()).toBe(2024);
		expect(d!.getMonth()).toBe(5);
		expect(d!.getDate()).toBe(15);
	});
	it("passes through Date objects", () => {
		const input = new Date(2024, 0, 1);
		expect(parseDateString(input)).toBe(input);
	});
	it("returns null for empty string", () => expect(parseDateString("")).toBeNull());
	it("returns null for garbage", () => expect(parseDateString("not-a-date")).toBeNull());
	it("returns null for null", () => expect(parseDateString(null)).toBeNull());
	it("returns null for invalid Date", () => expect(parseDateString(new Date("bad"))).toBeNull());
	it("parses numeric timestamp", () => {
		const ts = new Date(2024, 5, 1).getTime();
		const d = parseDateString(ts);
		expect(d).not.toBeNull();
	});
});

describe("monthBoundaries", () => {
	it("returns 12 entries", () => expect(monthBoundaries(2024).length).toBe(12));
	it("Jan startDay = 1", () => expect(monthBoundaries(2024)[0].startDay).toBe(1));
	it("Feb has 29 days in leap year", () => expect(monthBoundaries(2024)[1].days).toBe(29));
	it("Feb has 28 days in common year", () => expect(monthBoundaries(2023)[1].days).toBe(28));
	it("Dec startDay = 335 in common year", () => {
		// Jan(31)+Feb(28)+Mar(31)+Apr(30)+May(31)+Jun(30)+Jul(31)+Aug(31)+Sep(30)+Oct(31)+Nov(30) = 334 → Dec 1 = day 335
		expect(monthBoundaries(2023)[11].startDay).toBe(335);
	});
});
