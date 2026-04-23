import type { App } from "obsidian";
import type { CalendarItem, ColumnMapping } from "../types";
import type { DataSource } from "./DataSource";
import { parseDateString } from "../utils/dateUtils";

export class FrontmatterScanner implements DataSource {
	constructor(private app: App) {}

	scan(mapping: ColumnMapping, year: number): CalendarItem[] {
		const items: CalendarItem[] = [];
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;

			const startRaw = fm[mapping.startDateProp];
			if (startRaw === undefined) continue;

			const dateStart = parseDateString(startRaw);
			if (!dateStart) continue;

			// Filter by year early
			if (dateStart.getFullYear() > year) continue;

			let dateEnd: Date;
			const endRaw = fm[mapping.endDateProp];
			const parsedEnd = endRaw !== undefined ? parseDateString(endRaw) : null;
			if (parsedEnd) {
				dateEnd = parsedEnd;
			} else {
				// No end date: treat as single-day event
				dateEnd = new Date(dateStart);
			}

			// Skip if event ends before this year
			if (dateEnd.getFullYear() < year) continue;

			// Clamp to year boundaries for display
			const yearStart = new Date(year, 0, 1);
			const yearEnd = new Date(year, 11, 31);
			const clampedStart = dateStart < yearStart ? yearStart : dateStart;
			const clampedEnd = dateEnd > yearEnd ? yearEnd : dateEnd;

			const title =
				mapping.titleProp === "__filename__"
					? file.basename
					: typeof fm[mapping.titleProp] === "string"
						? fm[mapping.titleProp]
						: file.basename;

			// Always read tags, filter for linear-calendar/* subtags
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

			// Icon (Lucide icon name from frontmatter)
			const icon =
				mapping.iconProp && typeof fm[mapping.iconProp] === "string"
					? fm[mapping.iconProp]
					: undefined;

			items.push({
				filePath: file.path,
				title,
				dateStart: clampedStart,
				dateEnd: clampedEnd,
				tags,
				icon,
			});
		}

		// Sort by start date
		items.sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
		return items;
	}
}
