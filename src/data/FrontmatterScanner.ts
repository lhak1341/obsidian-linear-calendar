import { debounce, type App, type Component, type Debouncer, type TFile } from "obsidian";
import type { CalendarItem, ColumnMapping, RawCalendarItem } from "../types";
import type { DataSource } from "./DataSource";
import { expandForYear } from "../utils/calendarItems";
import { mapFrontmatterToItem, deriveReminderItem, hasGateTag } from "../utils/frontmatterMapper";

interface CacheEntry {
	mtime: number;
	items: RawCalendarItem[]; // empty = file has no valid calendar data. A note can yield its real item plus a reminder ghost.
}

/** Quiet period before subscribers hear about a burst of vault events. */
const CHANGE_DEBOUNCE_MS = 300;

export class FrontmatterScanner implements DataSource {
	private cache = new Map<string, CacheEntry>();
	private sortedItems: CalendarItem[] | null = null;
	private sortedYear: number | null = null;
	/** The mapping the cache was built with; a different one makes every entry stale. */
	private mappingSig: string | null = null;
	private subscribers = new Set<() => void>();
	private notifySubscribers: Debouncer<[], void>;

	/** `owner` scopes the vault listeners and the pending notification to its unload. */
	constructor(private app: App, owner: Component) {
		this.notifySubscribers = debounce(() => {
			for (const cb of [...this.subscribers]) cb();
		}, CHANGE_DEBOUNCE_MS, true);

		owner.registerEvent(
			app.metadataCache.on("changed", (file) => {
				const relevant = this.hasCalendarEntry(file.path) || this.hasGateTagNow(file);
				// The metadata cache just re-parsed this file, so an entry cached from an earlier
				// read is stale even when the file's mtime has not moved since (a scan that ran
				// between the write and the re-parse cached the old frontmatter under the new mtime).
				this.cache.delete(file.path);
				// Skip files that have never been (and aren't now) calendar notes.
				if (relevant) this.notifySubscribers();
			}),
		);
		owner.registerEvent(app.vault.on("delete", (file) => this.drop(file.path)));
		owner.registerEvent(app.vault.on("rename", (_file, oldPath) => this.drop(oldPath)));
		owner.register(() => this.notifySubscribers.cancel());
	}

	onChange(cb: () => void): () => void {
		this.subscribers.add(cb);
		return () => { this.subscribers.delete(cb); };
	}

	private hasCalendarEntry(path: string): boolean {
		const entry = this.cache.get(path);
		return entry !== undefined && entry.items.length > 0;
	}

	private hasGateTagNow(file: TFile): boolean {
		const cache = this.app.metadataCache.getFileCache(file);
		return hasGateTag(cache?.frontmatter?.tags, (cache?.tags ?? []).map((t) => t.tag));
	}

	/** A file left its path: forget it, and tell subscribers only if it was a calendar note. */
	private drop(path: string): void {
		const wasCalendarNote = this.hasCalendarEntry(path);
		if (this.cache.delete(path)) this.sortedItems = null;
		if (wasCalendarNote) this.notifySubscribers();
	}

	scan(mapping: ColumnMapping, year: number): CalendarItem[] {
		const sig = JSON.stringify(mapping);
		if (sig !== this.mappingSig) {
			this.mappingSig = sig;
			this.cache.clear();
		}

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

		const rawItems: RawCalendarItem[] = [];
		for (const entry of this.cache.values()) rawItems.push(...entry.items);
		const items = expandForYear(rawItems, year);

		items.sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
		this.sortedItems = items;
		this.sortedYear = year;
		return items;
	}

	private processFile(file: TFile, mapping: ColumnMapping): RawCalendarItem[] {
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
