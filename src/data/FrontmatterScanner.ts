import type { App, TFile } from "obsidian";
import type { CalendarItem, ColumnMapping } from "../types";
import type { DataSource, ScannerCache } from "./DataSource";
import { projectAnniversaryDates } from "../utils/dateUtils";
import { mapFrontmatterToItem, deriveReminderItem } from "../utils/frontmatterMapper";

interface CacheEntry {
	mtime: number;
	items: CalendarItem[]; // empty = file has no valid calendar data. A note can yield its real item plus a reminder ghost.
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
		return entry !== undefined && entry.items.length > 0;
	}

	scan(mapping: ColumnMapping, year: number): CalendarItem[] {
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const mtime = file.stat.mtime;
			const cached = this.cache.get(file.path);

			if (cached && cached.mtime === mtime) continue;

			const items = this.processFile(file, mapping);
			this.cache.set(file.path, { mtime, items });
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
			for (const rawItem of entry.items) {
				let { dateStart, dateEnd } = rawItem;

				// Anniversary: project month/day into the current year for past events
				const isProjected = rawItem.anniversary === true && dateStart.getFullYear() < year;
				if (isProjected) {
					({ dateStart, dateEnd } = projectAnniversaryDates(dateStart, dateEnd, year));
				}

				if (dateStart > yearEnd || dateEnd < yearStart) continue;

				items.push({
					...rawItem,
					anniversary: isProjected || undefined,
					dateStart: dateStart < yearStart ? yearStart : dateStart,
					dateEnd: dateEnd > yearEnd ? yearEnd : dateEnd,
				});
			}
		}

		items.sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
		this.sortedItems = items;
		this.sortedYear = year;
		return items;
	}

	private processFile(file: TFile, mapping: ColumnMapping): CalendarItem[] {
		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		const inlineTags = (cache?.tags ?? []).map((t) => t.tag);
		const item = mapFrontmatterToItem(frontmatter, inlineTags, file.path, file.basename, mapping);
		if (!item) return [];

		const items = [item];
		const reminderItem = frontmatter ? deriveReminderItem(item, frontmatter, mapping) : null;
		if (reminderItem) items.push(reminderItem);
		return items;
	}
}
