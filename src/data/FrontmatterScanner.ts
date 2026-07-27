import type { App, TFile } from "obsidian";
import type { CalendarItem, ColumnMapping } from "../types";
import type { DataSource, ScannerCache } from "./DataSource";
import { projectAnniversaryDates } from "../utils/dateUtils";
import { mapFrontmatterToItem } from "../utils/frontmatterMapper";

interface CacheEntry {
	mtime: number;
	item: CalendarItem | null; // null = file has no valid calendar data
}

export class FrontmatterScanner implements DataSource, ScannerCache {
	private cache = new Map<string, CacheEntry>();
	private sortedItems: CalendarItem[] | null = null;
	private sortedYear: number | null = null;

	constructor(private app: App) {}

	// Called from main.ts after settings save to force a fresh scan.
	invalidateMapping(): void {
		this.cache.clear();
		this.sortedItems = null;
	}

	// Called from main.ts vault delete/rename handlers for O(1) eviction.
	evictFile(path: string): void {
		if (this.cache.delete(path)) {
			this.sortedItems = null;
		}
	}

	hasCalendarEntry(path: string): boolean {
		const entry = this.cache.get(path);
		return entry !== undefined && entry.item !== null;
	}

	scan(mapping: ColumnMapping, year: number): CalendarItem[] {
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const mtime = file.stat.mtime;
			const cached = this.cache.get(file.path);

			if (cached && cached.mtime === mtime) continue;

			const item = this.processFile(file, mapping);
			this.cache.set(file.path, { mtime, item });
			this.sortedItems = null; // invalidate sort cache on any data change
		}

		// Return cached sorted result when nothing changed and year matches.
		if (this.sortedItems !== null && year === this.sortedYear) {
			return this.sortedItems;
		}

		// Collect and filter by year
		const items: CalendarItem[] = [];
		const yearStart = new Date(year, 0, 1);
		const yearEnd = new Date(year, 11, 31);

		for (const entry of this.cache.values()) {
			if (!entry.item) continue;
			let { dateStart, dateEnd } = entry.item;

			// Anniversary: project month/day into the current year for past events
			const isProjected = entry.item.anniversary === true && dateStart.getFullYear() < year;
			if (isProjected) {
				({ dateStart, dateEnd } = projectAnniversaryDates(dateStart, dateEnd, year));
			}

			if (dateStart > yearEnd || dateEnd < yearStart) continue;

			items.push({
				...entry.item,
				anniversary: isProjected || undefined,
				dateStart: dateStart < yearStart ? yearStart : dateStart,
				dateEnd: dateEnd > yearEnd ? yearEnd : dateEnd,
			});
		}

		items.sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
		this.sortedItems = items;
		this.sortedYear = year;
		return items;
	}

	private processFile(file: TFile, mapping: ColumnMapping): CalendarItem | null {
		const cache = this.app.metadataCache.getFileCache(file);
		const inlineTags = (cache?.tags ?? []).map((t) => t.tag);
		return mapFrontmatterToItem(cache?.frontmatter, inlineTags, file.path, file.basename, mapping);
	}
}
