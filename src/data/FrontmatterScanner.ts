import type { App, TFile } from "obsidian";
import type { CalendarItem, ColumnMapping } from "../types";
import type { DataSource } from "./DataSource";
import { parseDateString, projectAnniversaryDates } from "../utils/dateUtils";

interface CacheEntry {
	mtime: number;
	item: CalendarItem | null; // null = file has no valid calendar data
}

export class FrontmatterScanner implements DataSource {
	private cache = new Map<string, CacheEntry>();
	private generation = 0;
	private lastGeneration = -1;
	private sortedItems: CalendarItem[] | null = null;
	private sortedYear: number | null = null;

	constructor(private app: App) {}

	// Called from main.ts after settings save to force a fresh scan.
	invalidateMapping(): void {
		this.generation++;
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
		if (this.generation !== this.lastGeneration) {
			// Cache was already cleared in invalidateMapping(); just sync the counter.
			this.lastGeneration = this.generation;
		}

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
		const fm = cache?.frontmatter;
		if (!fm) return null;

		// Gate: only process notes tagged #linear-calendar
		const fmTags = Array.isArray(fm.tags)
			? fm.tags.map(String)
			: typeof fm.tags === "string"
				? [fm.tags]
				: [];
		const inlineTags = (cache?.tags ?? []).map((t) => t.tag);
		const hasGateTag =
			fmTags.some((t) => t === "linear-calendar" || t.startsWith("linear-calendar/")) ||
			inlineTags.some((t) => t === "#linear-calendar" || t.startsWith("#linear-calendar/"));
		if (!hasGateTag) return null;

		const startRaw = fm[mapping.startDateProp];
		if (startRaw === undefined) return null;

		const dateStart = parseDateString(startRaw);
		if (!dateStart) return null;

		let dateEnd: Date;
		const endRaw = fm[mapping.endDateProp];
		const parsedEnd = endRaw !== undefined ? parseDateString(endRaw) : null;
		dateEnd = parsedEnd ?? new Date(dateStart);

		const title =
			mapping.titleProp === "__filename__"
				? file.basename
				: typeof fm[mapping.titleProp] === "string"
					? fm[mapping.titleProp]
					: file.basename;

		const tags: string[] = [];
		const rawTags = fm.tags;
		if (rawTags) {
			const tagList = Array.isArray(rawTags)
				? rawTags.map(String)
				: typeof rawTags === "string"
					? [rawTags]
					: [];
			for (const t of tagList) {
				if (t.startsWith("linear-calendar/")) {
					tags.push(t);
				}
			}
		}

		const icon =
			mapping.iconProp && typeof fm[mapping.iconProp] === "string"
				? fm[mapping.iconProp]
				: undefined;

		const anniversary =
			mapping.anniversaryProp ? fm[mapping.anniversaryProp] === true : false;

		return {
			filePath: file.path,
			title,
			dateStart,
			dateEnd,
			tags,
			icon,
			anniversary: anniversary || undefined,
		};
	}
}
