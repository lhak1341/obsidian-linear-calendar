import type { App, TFile } from "obsidian";
import type { CalendarItem, ColumnMapping } from "../types";
import type { DataSource } from "./DataSource";
import { parseDateString } from "../utils/dateUtils";

interface CacheEntry {
	mtime: number;
	item: CalendarItem | null; // null = file has no valid calendar data
}

export class FrontmatterScanner implements DataSource {
	private cache = new Map<string, CacheEntry>();
	private lastMapping: string | null = null;

	constructor(private app: App) {}

	scan(mapping: ColumnMapping, year: number): CalendarItem[] {
		const mappingKey = JSON.stringify(mapping);
		// Invalidate entire cache if mapping changed
		if (mappingKey !== this.lastMapping) {
			this.cache.clear();
			this.lastMapping = mappingKey;
		}

		const files = this.app.vault.getMarkdownFiles();
		const currentPaths = new Set<string>();

		for (const file of files) {
			currentPaths.add(file.path);
			const mtime = file.stat.mtime;
			const cached = this.cache.get(file.path);

			if (cached && cached.mtime === mtime) continue;

			// Reprocess this file
			const item = this.processFile(file, mapping);
			this.cache.set(file.path, { mtime, item });
		}

		// Remove deleted files from cache
		for (const path of this.cache.keys()) {
			if (!currentPaths.has(path)) {
				this.cache.delete(path);
			}
		}

		// Collect and filter by year
		const items: CalendarItem[] = [];
		const yearStart = new Date(year, 0, 1);
		const yearEnd = new Date(year, 11, 31);

		for (const entry of this.cache.values()) {
			if (!entry.item) continue;
			const { dateStart, dateEnd } = entry.item;

			// Filter by year
			if (dateStart > yearEnd || dateEnd < yearStart) continue;

			// Clamp to year boundaries
			items.push({
				...entry.item,
				dateStart: dateStart < yearStart ? yearStart : dateStart,
				dateEnd: dateEnd > yearEnd ? yearEnd : dateEnd,
			});
		}

		items.sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
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

		return {
			filePath: file.path,
			title,
			dateStart,
			dateEnd,
			tags,
			icon,
		};
	}
}
