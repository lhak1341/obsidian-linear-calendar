import type { CalendarItem, PluginSettings } from "../types";
import { COLOR_PALETTE } from "../constants";

/**
 * Build a stable tag→color map from ALL items.
 * User-defined colorMap takes priority, then palette assignment
 * in order of first appearance. Uncategorized items get "__uncategorized__".
 */
export function buildTagColorMap(
	items: CalendarItem[],
	settings: PluginSettings,
): Map<string, string> {
	const map = new Map<string, string>();
	let paletteIdx = 0;

	for (const item of items) {
		const tag = item.tags?.[0] ?? "__uncategorized__";
		if (map.has(tag)) continue;

		const userColor = settings.colorMap[tag];
		if (userColor) {
			map.set(tag, userColor);
		} else {
			map.set(tag, COLOR_PALETTE[paletteIdx % COLOR_PALETTE.length]);
			paletteIdx++;
		}
	}

	return map;
}

/** Return '#000' or '#fff' for maximum contrast against a hex background. */
export function getContrastColor(hex: string): string {
	// Expand 3-digit hex to 6-digit
	const normalized = /^#[0-9a-f]{3}$/i.test(hex)
		? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
		: hex;
	if (!/^#[0-9a-f]{6}$/i.test(normalized)) return "#000";
	const r = parseInt(normalized.slice(1, 3), 16) / 255;
	const g = parseInt(normalized.slice(3, 5), 16) / 255;
	const b = parseInt(normalized.slice(5, 7), 16) / 255;
	const lin = (c: number) =>
		c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
	return L > 0.179 ? "#000" : "#fff";
}
