import { nearestHue } from "@lhak/style";
import type { CalendarItem, TagHue } from "../types";
import { HUE_ORDER } from "../constants";
import { categoryOf } from "./category";

/**
 * Build a stable tag→hue map from ALL items.
 * A hue chosen in colorMap takes priority; other tags take the hues in HUE_ORDER, in
 * order of first appearance, repeating past 8. Uncategorized items get UNCATEGORIZED.
 */
export function buildTagColorMap(
	items: CalendarItem[],
	colorMap: Record<string, TagHue>,
): Map<string, TagHue> {
	const map = new Map<string, TagHue>();
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

/**
 * OKLab chroma below which a saved hex colour reads as grey. The old Google palette's Graphite
 * (#616161) is 0; its least saturated colour, Lavender (#7986CB), is about 0.09.
 */
const NEUTRAL_CHROMA = 0.03;

/**
 * A saved tag colour as a tag hue: a hue name or `"grey"` maps to itself, a near-neutral hex
 * colour to grey (`nearestHue` knows only the 8 hues, so it would give a grey some hue), any
 * other hex colour to its `nearestHue`. Anything else is `undefined`.
 */
export function tagHueFromSaved(colour: unknown): TagHue | undefined {
	if (typeof colour !== "string") return undefined;
	if (colour === "grey") return "grey";
	const chroma = oklabChroma(colour);
	if (chroma !== undefined && chroma < NEUTRAL_CHROMA) return "grey";
	return nearestHue(colour);
}

/** The OKLab chroma of a hex colour (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`; alpha ignored). */
function oklabChroma(hex: string): number | undefined {
	const digits = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex)?.[1];
	if (digits === undefined) return undefined;
	const full = digits.length <= 4 ? [...digits].map((d) => d + d).join("") : digits;
	const [r, g, b] = [0, 2, 4].map((i) => {
		const c = parseInt(full.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];
	// Björn Ottosson's linear sRGB to OKLab matrices (as @lhak/style's nearestHue uses).
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return Math.hypot(a, bb);
}

/** A computed `rgb(r, g, b)` or `rgba(...)` colour as `#rrggbb`, for a colour input; null otherwise. */
export function rgbToHex(rgb: string): string | null {
	const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(rgb.trim());
	if (!m) return null;
	return "#" + [m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("");
}
