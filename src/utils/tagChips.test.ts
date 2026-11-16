import { describe, expect, it } from "vitest";
import { subtagFromInput, tagChips } from "./tagChips";
import { UNCATEGORIZED } from "./category";
import type { TagHue } from "../types";

const auto = (entries: [string, TagHue][]) => new Map(entries);

describe("tagChips", () => {
	it("lists this year's categories first, then tags that only have settings", () => {
		const chips = tagChips(
			auto([["linear-calendar/work", "blue"], ["linear-calendar/pet", "orange"]]),
			{ "linear-calendar/old": "red" },
			{ "linear-calendar/gone": "cake" },
			new Set(["linear-calendar/work", "linear-calendar/pet", "linear-calendar/old"]),
		);
		expect(chips.map((c) => c.tag)).toEqual(["linear-calendar/work", "linear-calendar/pet", "linear-calendar/old", "linear-calendar/gone"]);
	});

	it("paints a chosen hue over the automatic one, and marks which it is", () => {
		const [work, pet] = tagChips(
			auto([["linear-calendar/work", "blue"], ["linear-calendar/pet", "orange"]]),
			{ "linear-calendar/work": "grey" },
			{},
			new Set(["linear-calendar/work", "linear-calendar/pet"]),
		);
		expect(work).toMatchObject({ hue: "grey", chosen: true });
		expect(pet).toMatchObject({ hue: "orange", chosen: false });
	});

	it("gives a tag with only an icon, outside this year, no hue", () => {
		const [chip] = tagChips(auto([]), {}, { "linear-calendar/trip": "plane" }, new Set(["linear-calendar/trip"]));
		expect(chip).toEqual({ tag: "linear-calendar/trip", hue: null, chosen: false, inNotes: true });
	});

	it("knows which tags no note uses, and counts uncategorized as used", () => {
		const chips = tagChips(auto([[UNCATEGORIZED, "blue"]]), { "linear-calendar/gone": "red" }, {}, new Set());
		expect(chips.map((c) => c.inNotes)).toEqual([true, false]);
	});
});

describe("subtagFromInput", () => {
	it("reads a bare name, a hashtag and a full tag the same way", () => {
		for (const input of ["work", " #work ", "linear-calendar/work", "#linear-calendar/work"]) {
			expect(subtagFromInput(input)).toBe("linear-calendar/work");
		}
	});

	it("keeps nested subtags", () => {
		expect(subtagFromInput("work/meetings")).toBe("linear-calendar/work/meetings");
	});

	it("rejects empty names and names with spaces", () => {
		for (const input of ["", "  ", "#", "linear-calendar/", "day off"]) expect(subtagFromInput(input)).toBeNull();
	});
});
