import type { CalendarItem, ColumnMapping } from "../types";

export interface DataSource {
	/** Items for `year`. A changed `mapping` is picked up on the next call — no invalidation needed. */
	scan(mapping: ColumnMapping, year: number): CalendarItem[];
	/**
	 * Calls `cb` (debounced, no arguments) after calendar items may have changed: a calendar
	 * note was edited, deleted, or renamed. Repaint by calling `scan` again. Returns the unsubscribe.
	 */
	onChange(cb: () => void): () => void;
}
