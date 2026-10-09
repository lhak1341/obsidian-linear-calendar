import type { CalendarItem } from "../types";
import { formatTagLabel } from "./tagUtils";

/**
 * Key for items with no calendar subtag. The string is persisted (view state's
 * `hiddenCategories`), so changing it silently un-hides a hidden "Other" chip.
 */
export const UNCATEGORIZED = "__uncategorized__";

/** An item's category: its first calendar subtag, else UNCATEGORIZED. */
export function categoryOf(item: CalendarItem): string {
	return item.tags?.[0] ?? UNCATEGORIZED;
}

/** Display name for a category key: "Other" for UNCATEGORIZED, else the tag without its `linear-calendar/` prefix. */
export function categoryLabel(category: string): string {
	return category === UNCATEGORIZED ? "Other" : formatTagLabel(category);
}

/** Items whose category is not in `hidden`. */
export function visibleItems(items: CalendarItem[], hidden: Set<string>): CalendarItem[] {
	return items.filter((item) => !hidden.has(categoryOf(item)));
}

/** Item count per category, keyed in first-appearance order (which is the chip order). */
export function countByCategory(items: CalendarItem[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const item of items) {
		const category = categoryOf(item);
		counts.set(category, (counts.get(category) ?? 0) + 1);
	}
	return counts;
}
