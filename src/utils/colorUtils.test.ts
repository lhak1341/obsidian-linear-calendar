import { describe, it, expect } from "vitest";
import { getContrastColor, buildTagColorMap } from "./colorUtils";
import type { CalendarItem, PluginSettings } from "../types";
import { COLOR_PALETTE } from "../constants";

describe("getContrastColor", () => {
	it("white background → black text", () => expect(getContrastColor("#ffffff")).toBe("#000"));
	it("black background → white text", () => expect(getContrastColor("#000000")).toBe("#fff"));
	it("3-digit hex expanded correctly", () => expect(getContrastColor("#fff")).toBe("#000"));
	it("mid-dark blue → white text", () => expect(getContrastColor("#039BE5")).toBe("#000"));
	it("dark red → white text", () => expect(getContrastColor("#D50000")).toBe("#fff"));
	it("invalid hex → defaults to black", () => expect(getContrastColor("not-a-color")).toBe("#000"));
});

function makeItem(tag?: string): CalendarItem {
	return {
		filePath: "f.md",
		title: "T",
		dateStart: new Date("2024-01-01"),
		dateEnd: new Date("2024-01-01"),
		tags: tag ? [tag] : undefined,
	};
}

function makeSettings(colorMap: Record<string, string> = {}): PluginSettings {
	return {
		defaultMapping: { titleProp: "__filename__", startDateProp: "datestart", endDateProp: "dateend", iconProp: "icon", anniversaryProp: "anniversary" },
		viewConfigs: {},
		colorMap,
		iconMap: {},
		alignMode: "date",
		dailyNoteColor: null,
		dailyNoteStyle: "tint",
	};
}

describe("buildTagColorMap", () => {
	it("empty items → empty map", () => {
		expect(buildTagColorMap([], makeSettings()).size).toBe(0);
	});

	it("item with no tag → __uncategorized__ key", () => {
		const map = buildTagColorMap([makeItem()], makeSettings());
		expect(map.has("__uncategorized__")).toBe(true);
	});

	it("assigns palette colors in order", () => {
		const items = [makeItem("a"), makeItem("b"), makeItem("c")];
		const map = buildTagColorMap(items, makeSettings());
		expect(map.get("a")).toBe(COLOR_PALETTE[0]);
		expect(map.get("b")).toBe(COLOR_PALETTE[1]);
		expect(map.get("c")).toBe(COLOR_PALETTE[2]);
	});

	it("user colorMap takes priority over palette", () => {
		const map = buildTagColorMap([makeItem("work")], makeSettings({ work: "#ff0000" }));
		expect(map.get("work")).toBe("#ff0000");
	});

	it("duplicate tags assigned same color, palette index not advanced", () => {
		const items = [makeItem("a"), makeItem("a"), makeItem("b")];
		const map = buildTagColorMap(items, makeSettings());
		expect(map.get("a")).toBe(COLOR_PALETTE[0]);
		expect(map.get("b")).toBe(COLOR_PALETTE[1]);
	});

	it("wraps palette when more tags than colors", () => {
		const tags = Array.from({ length: COLOR_PALETTE.length + 1 }, (_, i) => `tag${i}`);
		const items = tags.map((t) => makeItem(t));
		const map = buildTagColorMap(items, makeSettings());
		expect(map.get(`tag${COLOR_PALETTE.length}`)).toBe(COLOR_PALETTE[0]);
	});
});
