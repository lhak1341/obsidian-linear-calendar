import type { CalendarItem, ColumnMapping } from "../types";

export interface DataSource {
	scan(mapping: ColumnMapping, year: number): CalendarItem[];
}
