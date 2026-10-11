import { moment, normalizePath } from "obsidian";

/** The two settings that define where new event notes live and how they are named. */
export interface EventNoteConfig {
	/** `newEventFolder`; empty = vault root. */
	folder: string;
	/** `newEventDateFormat` (moment format); empty = `YYYY-MM-DD`. */
	format: string;
}

/** Reads the config off settings (at call time — settings are mutable). */
export function eventNoteConfig(settings: { newEventFolder: string; newEventDateFormat: string }): EventNoteConfig {
	return { folder: settings.newEventFolder, format: settings.newEventDateFormat };
}

const DEFAULT_FORMAT = "YYYY-MM-DD";

/** The date part of an event note's name, per `cfg.format`. */
export function datePrefix(date: Date, cfg: EventNoteConfig): string {
	return (moment as unknown as (d: Date) => { format(f: string): string })(date).format(cfg.format || DEFAULT_FORMAT);
}

/** Event note name without extension: `"{datePrefix} {title}"`. Filename-hostile characters become `-`; a blank title becomes "Untitled". */
export function fileBaseName(date: Date, title: string | undefined, cfg: EventNoteConfig): string {
	const trimmed = title?.trim();
	const safeTitle = trimmed ? trimmed.replace(/[\\/:*?"<>|]/g, "-") : "Untitled";
	return `${datePrefix(date, cfg)} ${safeTitle}`;
}

/** Whether the note at `filePath` sits directly in the event folder (no subfolders). `""` and `"/"` both mean the vault root. */
export function isEventNotePath(filePath: string, cfg: EventNoteConfig): boolean {
	const slash = filePath.lastIndexOf("/");
	const dirPath = slash < 0 ? "" : filePath.slice(0, slash);
	return normalizePath(dirPath || "/") === normalizePath(cfg.folder || "/");
}

/** Whether `basename` starts with `date`'s prefix followed by a space — i.e. was named by `fileBaseName`. */
export function hasDatePrefix(basename: string, date: Date, cfg: EventNoteConfig): boolean {
	return basename.startsWith(`${datePrefix(date, cfg)} `);
}

/** `basename` without `date`'s prefix and the space after it; unchanged if it doesn't start with one. */
export function stripDatePrefix(basename: string, date: Date, cfg: EventNoteConfig): string {
	return hasDatePrefix(basename, date, cfg) ? basename.slice(datePrefix(date, cfg).length + 1) : basename;
}
