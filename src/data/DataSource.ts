import type { CalendarItem } from "../types";

export interface DataSource {
	/**
	 * Items touching the calendar days `first`..`last` (inclusive; time of day ignored), each
	 * with its own span, never cut to the requested one. Sorted by start, then path, then kind.
	 * Reads the current column mapping itself, so a changed mapping needs no invalidation.
	 */
	items(first: Date, last: Date): CalendarItem[];
	/**
	 * Calls `cb` (debounced, no arguments) after calendar items may have changed: a calendar
	 * note was edited, deleted, or renamed. Repaint by calling `items` again. Returns the unsubscribe.
	 */
	onChange(cb: () => void): () => void;
}
