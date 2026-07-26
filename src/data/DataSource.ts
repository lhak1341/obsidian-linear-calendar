import type { CalendarItem, ColumnMapping } from "../types";

export interface DataSource {
	scan(mapping: ColumnMapping, year: number): CalendarItem[];
	hasCalendarEntry(path: string): boolean;
}

/** Cache-consistency contract for keeping a DataSource's cache in sync with vault mutations. */
export interface ScannerCache {
	evictFile(path: string): void;
	invalidateMapping(): void;
}
