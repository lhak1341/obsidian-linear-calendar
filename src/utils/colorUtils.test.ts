import { describe, it, expect } from "vitest";
import { buildTagColorMap } from "./colorUtils";
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
