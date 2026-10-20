import { describe, it, expect } from "vitest";
import { restoreViewState, type ViewState } from "./viewState";

const fallback: ViewState = { year: 2026, hiddenCategories: ["a"], rowHeight: 10, layout: "horizontal" };

describe("restoreViewState", () => {
	it("applies a full valid state", () => {
		const raw = { year: 2030, hiddenCategories: ["x", "y"], rowHeight: 40, layout: "vertical" };
		expect(restoreViewState(raw, fallback)).toEqual(raw);
	});

	it("keeps the fallback for fields a partial state omits", () => {
		expect(restoreViewState({ year: 2030 }, fallback)).toEqual({ ...fallback, year: 2030 });
	});

	it.each([undefined, null, "2030", 7, ["x"]])("returns the fallback for non-object %j", (raw) => {
		expect(restoreViewState(raw, fallback)).toEqual(fallback);
	});

	it("rejects an unknown layout without losing the other fields", () => {
		expect(restoreViewState({ year: 2030, layout: "diagonal" }, fallback))
			.toEqual({ ...fallback, year: 2030 });
	});

	it.each([0, 50, 999, 10000, 3.5, 2030.5, NaN, Infinity, "2030"])("rejects year %j", (year) => {
		expect(restoreViewState({ year }, fallback).year).toBe(2026);
	});

	it("accepts the year range edges", () => {
		expect(restoreViewState({ year: 1000 }, fallback).year).toBe(1000);
		expect(restoreViewState({ year: 9999 }, fallback).year).toBe(9999);
	});

	it("keeps the fallback when hiddenCategories is not an array", () => {
		expect(restoreViewState({ hiddenCategories: "a" }, fallback).hiddenCategories).toEqual(["a"]);
	});

	it("drops non-string entries from hiddenCategories", () => {
		expect(restoreViewState({ hiddenCategories: ["x", 1, null, "y"] }, fallback).hiddenCategories)
			.toEqual(["x", "y"]);
	});

	it("clamps rowHeight to 0-100", () => {
		expect(restoreViewState({ rowHeight: -5 }, fallback).rowHeight).toBe(0);
		expect(restoreViewState({ rowHeight: 500 }, fallback).rowHeight).toBe(100);
		expect(restoreViewState({ rowHeight: 0 }, fallback).rowHeight).toBe(0);
	});

	it.each([NaN, Infinity, "40"])("keeps the fallback rowHeight for %j", (rowHeight) => {
		expect(restoreViewState({ rowHeight }, fallback).rowHeight).toBe(10);
	});
});
