import { describe, it, expect } from "vitest";
import { mapFrontmatterToItem } from "./frontmatterMapper";
import type { ColumnMapping } from "../types";

const mapping: ColumnMapping = {
	titleProp: "title",
	startDateProp: "start",
	endDateProp: "end",
	iconProp: "icon",
	anniversaryProp: "anniversary",
	descriptionProp: "description",
};

function map(fm: Record<string, unknown> | undefined, inlineTags: string[] = []) {
	return mapFrontmatterToItem(fm, inlineTags, "note.md", "note", mapping);
}

describe("mapFrontmatterToItem — gating", () => {
	it("returns null when frontmatter is undefined", () => {
		expect(map(undefined)).toBeNull();
	});

	it("returns null when no gate tag present", () => {
		expect(map({ start: "2024-01-01", tags: ["other"] })).toBeNull();
	});

	it("gates on frontmatter.tags array, no # prefix", () => {
		expect(map({ start: "2024-01-01", tags: ["linear-calendar"] })).not.toBeNull();
	});

	it("gates on frontmatter.tags subtag", () => {
		expect(map({ start: "2024-01-01", tags: ["linear-calendar/work"] })).not.toBeNull();
	});

	it("gates on frontmatter.tags as a single string", () => {
		expect(map({ start: "2024-01-01", tags: "linear-calendar" })).not.toBeNull();
	});

	it("gates on inline tag, # prefix required", () => {
		expect(map({ start: "2024-01-01" }, ["#linear-calendar"])).not.toBeNull();
	});

	it("gates on inline subtag", () => {
		expect(map({ start: "2024-01-01" }, ["#linear-calendar/work"])).not.toBeNull();
	});

	it("does not gate on inline tag missing the # prefix", () => {
		expect(map({ start: "2024-01-01" }, ["linear-calendar"])).toBeNull();
	});

	it("returns null when start date prop is missing", () => {
		expect(map({ tags: ["linear-calendar"] })).toBeNull();
	});

	it("returns null when start date is unparseable", () => {
		expect(map({ start: "not-a-date", tags: ["linear-calendar"] })).toBeNull();
	});
});

describe("mapFrontmatterToItem — dates", () => {
	it("defaults dateEnd to dateStart when end prop absent", () => {
		const item = map({ start: "2024-03-10", tags: ["linear-calendar"] });
		expect(item?.dateStart).toEqual(new Date(2024, 2, 10));
		expect(item?.dateEnd).toEqual(new Date(2024, 2, 10));
	});

	it("defaults dateEnd to dateStart when end date is unparseable", () => {
		const item = map({ start: "2024-03-10", end: "garbage", tags: ["linear-calendar"] });
		expect(item?.dateEnd).toEqual(new Date(2024, 2, 10));
	});

	it("uses parsed end date when present", () => {
		const item = map({ start: "2024-03-10", end: "2024-03-15", tags: ["linear-calendar"] });
		expect(item?.dateEnd).toEqual(new Date(2024, 2, 15));
	});
});

describe("mapFrontmatterToItem — title", () => {
	it("falls back to basename when titleProp is __filename__", () => {
		const item = mapFrontmatterToItem(
			{ start: "2024-01-01", title: "Ignored", tags: ["linear-calendar"] },
			[],
			"note.md",
			"note",
			{ ...mapping, titleProp: "__filename__" },
		);
		expect(item?.title).toBe("note");
	});

	it("uses frontmatter title when present", () => {
		const item = map({ start: "2024-01-01", title: "My Event", tags: ["linear-calendar"] });
		expect(item?.title).toBe("My Event");
	});

	it("falls back to basename when title prop is missing or not a string", () => {
		const item = map({ start: "2024-01-01", title: 42, tags: ["linear-calendar"] });
		expect(item?.title).toBe("note");
	});
});

describe("mapFrontmatterToItem — tags/icon/anniversary/description", () => {
	it("keeps only linear-calendar/ subtags in the returned tags list", () => {
		const item = map({ start: "2024-01-01", tags: ["linear-calendar", "linear-calendar/work", "other"] });
		expect(item?.tags).toEqual(["linear-calendar/work"]);
	});

	it("extracts icon when present as a string", () => {
		const item = map({ start: "2024-01-01", tags: ["linear-calendar"], icon: "cake" });
		expect(item?.icon).toBe("cake");
	});

	it("leaves icon undefined when not a string", () => {
		const item = map({ start: "2024-01-01", tags: ["linear-calendar"], icon: 1 });
		expect(item?.icon).toBeUndefined();
	});

	it("sets anniversary true only on exact boolean true", () => {
		const item = map({ start: "2024-01-01", tags: ["linear-calendar"], anniversary: true });
		expect(item?.anniversary).toBe(true);
	});

	it("leaves anniversary undefined (not false) when absent", () => {
		const item = map({ start: "2024-01-01", tags: ["linear-calendar"] });
		expect(item?.anniversary).toBeUndefined();
	});

	it("trims description and drops empty/whitespace-only values", () => {
		const withDesc = map({ start: "2024-01-01", tags: ["linear-calendar"], description: "  hello  " });
		expect(withDesc?.description).toBe("hello");

		const blank = map({ start: "2024-01-01", tags: ["linear-calendar"], description: "   " });
		expect(blank?.description).toBeUndefined();
	});
});
