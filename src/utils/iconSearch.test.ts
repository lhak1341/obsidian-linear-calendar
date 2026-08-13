import { describe, it, expect } from "vitest";
import { rankIconSuggestions } from "./iconSearch";

const ICON_NAMES = ["calendar", "calendar-range", "camera", "car", "cat", "cpu"];

describe("rankIconSuggestions", () => {
	it("ranks name matches by earliest match position, then alphabetically", () => {
		expect(rankIconSuggestions("ca", ICON_NAMES)).toEqual(["calendar", "calendar-range", "camera", "car", "cat"]);
	});

	it("returns every name when the query is empty", () => {
		expect(rankIconSuggestions("", ICON_NAMES)).toEqual(ICON_NAMES);
	});

	it("falls back to tag matches, ranked after every name match", () => {
		const getIconTags = (name: string) =>
			({ "flask-conical": ["lab", "chemistry"], atom: ["chemistry", "physics"], plane: ["flight"] })[name] ?? [];

		expect(rankIconSuggestions("chem", ["flask-conical", "atom", "plane"], getIconTags)).toEqual(["atom", "flask-conical"]);
	});

	it("never duplicates a name match as a tag match", () => {
		const getIconTags = (name: string) => ({ car: ["automobile"] })[name] ?? [];
		expect(rankIconSuggestions("car", ["car", "cat"], getIconTags)).toEqual(["car"]);
	});

	it("matches on name only when no tags lookup is passed (back-compat default)", () => {
		expect(rankIconSuggestions("chem", ["flask-conical"])).toEqual([]);
	});
});
