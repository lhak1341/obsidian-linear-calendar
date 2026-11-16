import type { TagHue } from "../types";
import { UNCATEGORIZED } from "./category";

const PREFIX = "linear-calendar/";

/** One tag as the settings tab lists it. */
export interface TagChip {
	tag: string;
	/** The hue it paints with: the chosen one, else its automatic one; null when it has neither. */
	hue: TagHue | null;
	/** True when the hue is chosen (`colorMap`), false when it is automatic. */
	chosen: boolean;
	/** True when some note uses the tag, so clearing its settings cannot make it disappear. */
	inNotes: boolean;
}

/**
 * The tags the settings tab shows, in calendar order: the categories of this year's items
 * (`autoMap`, first appearance), then tags that only have settings. A tag with settings but no
 * notes is listed so it can be removed.
 */
export function tagChips(
	autoMap: Map<string, TagHue>,
	colorMap: Record<string, TagHue>,
	iconMap: Record<string, string>,
	vaultTags: ReadonlySet<string>,
): TagChip[] {
	const tags = [...new Set([...autoMap.keys(), ...Object.keys(colorMap), ...Object.keys(iconMap)])];
	return tags.map((tag) => ({
		tag,
		hue: colorMap[tag] ?? autoMap.get(tag) ?? null,
		chosen: tag in colorMap,
		inNotes: tag === UNCATEGORIZED || vaultTags.has(tag),
	}));
}

/**
 * A typed tag name as a full calendar tag: `work`, `#work` and `linear-calendar/work` all give
 * `linear-calendar/work`. Null when nothing is left, or when it holds whitespace (tags cannot).
 */
export function subtagFromInput(input: string): string | null {
	const name = input.trim().replace(/^#/, "");
	const sub = name.startsWith(PREFIX) ? name.slice(PREFIX.length) : name;
	if (!sub || /\s/.test(sub)) return null;
	return PREFIX + sub;
}
