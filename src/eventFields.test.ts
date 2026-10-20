import { describe, it, expect } from "vitest";
import type { ColumnMapping } from "./types";
import { applyFields, readEventFields, type EventFields, type Frontmatter } from "./eventFields";

const mapping: ColumnMapping = {
	titleProp: "title",
	startDateProp: "dateStart",
	endDateProp: "dateEnd",
	iconProp: "icon",
	anniversaryProp: "anniversary",
	descriptionProp: "description",
	remindProp: "remindOn",
};

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

const full: EventFields = {
	title: "Talk",
	tag: "linear-calendar/work",
	anniversary: true,
	icon: "mic",
	dateEnd: d(2026, 3, 3),
	description: "Keynote",
	remindOn: d(2026, 2, 25),
};

describe("readEventFields", () => {
	it.each(["merge", "replace"] as const)("reads back what applyFields wrote (%s)", (mode) => {
		const fm: Frontmatter = {};
		applyFields(fm, mapping, d(2026, 3, 1), full, mode);
		expect(readEventFields(fm, mapping)).toEqual({ date: d(2026, 3, 1), fields: full });
	});

	it("reads an empty submission as no optional fields", () => {
		const fm: Frontmatter = {};
		applyFields(fm, mapping, d(2026, 3, 1), {}, "replace");
		expect(readEventFields(fm, mapping)).toEqual({
			date: d(2026, 3, 1),
			fields: { anniversary: false },
		});
	});

	it("returns a null date when the start is missing or unparseable", () => {
		expect(readEventFields({}, mapping).date).toBeNull();
		expect(readEventFields({ dateStart: "soon" }, mapping).date).toBeNull();
	});

	it("leaves the title undefined for a filename-titled mapping, even if the key is present", () => {
		const fm = { title: "Ignored", dateStart: "2026-03-01" };
		expect(readEventFields(fm, { ...mapping, titleProp: "__filename__" }).fields.title).toBeUndefined();
	});

	it("leaves the title undefined when the value is not a string", () => {
		expect(readEventFields({ title: 5 }, mapping).fields.title).toBeUndefined();
	});

	it("reads the first calendar subtag as the tag, and none for the bare gate tag", () => {
		expect(readEventFields({ tags: ["x", "linear-calendar/a", "linear-calendar/b"] }, mapping).fields.tag)
			.toBe("linear-calendar/a");
		expect(readEventFields({ tags: ["linear-calendar"] }, mapping).fields.tag).toBeUndefined();
		expect(readEventFields({ tags: "linear-calendar/solo" }, mapping).fields.tag).toBe("linear-calendar/solo");
	});

	it("skips end and remind dates whose property is unmapped", () => {
		const bare = { ...mapping, endDateProp: "", remindProp: "" };
		const { fields } = readEventFields({ dateEnd: "2026-03-03", remindOn: "2026-02-25", "": "2026-01-01" }, bare);
		expect(fields.dateEnd).toBeUndefined();
		expect(fields.remindOn).toBeUndefined();
	});
});
