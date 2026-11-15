import type { CalendarItem } from "../types";
import type { Hue } from "@lhak/style";
import { HUE_ORDER } from "../constants";
import { categoryOf } from "./category";

/**
 * Build a stable tag→hue map from ALL items.
 * A hue chosen in colorMap takes priority; other tags take the hues in HUE_ORDER, in
 * order of first appearance, repeating past 8. Uncategorized items get UNCATEGORIZED.
 */
export function buildTagColorMap(
	items: CalendarItem[],
	colorMap: Record<string, Hue>,
): Map<string, Hue> {
	const map = new Map<string, Hue>();
	let paletteIdx = 0;

	for (const item of items) {
		const tag = categoryOf(item);
		if (map.has(tag)) continue;

		const chosen = colorMap[tag];
		if (chosen) {
			map.set(tag, chosen);
		} else {
			map.set(tag, HUE_ORDER[paletteIdx % HUE_ORDER.length]);
			paletteIdx++;
		}
	}

	return map;
}
