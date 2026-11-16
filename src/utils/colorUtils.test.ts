import { describe, it, expect } from "vitest";
import { buildTagColorMap, rgbToHex, tagHueFromSaved } from "./colorUtils";
import type { CalendarItem } from "../types";

function makeItem(tag?: string): CalendarItem {
	return {
		kind: "event",
		filePath: "f.md",
		title: "T",
		dateStart: new Date("2024-01-01"),
		dateEnd: new Date("2024-01-01"),
		tags: tag ? [tag] : undefined,
	};
}

describe("buildTagColorMap", () => {
	it("empty items → empty map", () => {
		expect(buildTagColorMap([], {}).size).toBe(0);
	});

	it("item with no tag → __uncategorized__ key", () => {
		const map = buildTagColorMap([makeItem()], {});
		expect(map.has("__uncategorized__")).toBe(true);
	});

	it("assigns hues in the contract's fixed order", () => {
		const items = [makeItem("a"), makeItem("b"), makeItem("c")];
		const map = buildTagColorMap(items, {});
		expect([map.get("a"), map.get("b"), map.get("c")]).toEqual(["blue", "orange", "green"]);
	});

	it("user colorMap takes priority over palette", () => {
		const map = buildTagColorMap([makeItem("work")], { work: "red" });
		expect(map.get("work")).toBe("red");
	});

	it("duplicate tags assigned same color, palette index not advanced", () => {
		const items = [makeItem("a"), makeItem("a"), makeItem("b")];
		const map = buildTagColorMap(items, {});
		expect(map.get("a")).toBe("blue");
		expect(map.get("b")).toBe("orange");
	});

	it("repeats the hues past 8 categories", () => {
		const items = Array.from({ length: 10 }, (_, i) => makeItem(`tag${i}`));
		const map = buildTagColorMap(items, {});
		expect([...map.values()]).toEqual(["blue", "orange", "green", "purple", "cyan", "pink", "yellow", "red", "blue", "orange"]);
	});
});

describe("tagHueFromSaved", () => {
	it("keeps hue names and grey", () => {
		expect(tagHueFromSaved("red")).toBe("red");
		expect(tagHueFromSaved("grey")).toBe("grey");
	});

	it("reads near-neutral hex colours as grey, in every hex form", () => {
		for (const hex of ["#616161", "#000", "#ffff", "#FAFAFA", "#6a6a6680"]) expect(tagHueFromSaved(hex)).toBe("grey");
	});

	it("gives the least saturated old palette colour a hue, not grey", () => {
		expect(tagHueFromSaved("#7986CB")).not.toBe("grey");
	});

	it("drops anything that is not a colour", () => {
		for (const v of ["gray", "blurple", "#12", 7, null]) expect(tagHueFromSaved(v)).toBeUndefined();
	});
});

describe("rgbToHex", () => {
	it("reads computed rgb and rgba colours, in either separator style", () => {
		expect(rgbToHex("rgb(230, 124, 115)")).toBe("#e67c73");
		expect(rgbToHex("rgba(0, 0, 0, 0.5)")).toBe("#000000");
		expect(rgbToHex("rgb(255 255 255)")).toBe("#ffffff");
	});

	it("gives null for anything else", () => {
		for (const v of ["", "#fff", "hsl(0 0% 0%)", "oklch(0.7 0.1 30)"]) expect(rgbToHex(v)).toBeNull();
	});
});
