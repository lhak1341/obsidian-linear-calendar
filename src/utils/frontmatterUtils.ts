import { App, TFile, normalizePath } from "obsidian";
import type { ColumnMapping } from "../types";
import { datePrefix, hasDatePrefix, isInEventFolder, type EventNoteConfig } from "./eventNotePath";
import { carryDateForward, formatISODate, parseDateString } from "./dateUtils";


/**
 * Resolves the tags array to write for a note: strips any existing bare `linear-calendar`
 * gate tag or subtag, then puts the resolved calendar tag (trimmed `tag`, or the bare gate
 * tag when blank/omitted) at the front. `existingTags` accepts whatever shape frontmatter.tags
 * comes in as (array, single string/number, or absent).
 */
export function resolveCalendarTags(existingTags: unknown, tag: string | undefined): string[] {
	const calendarTag = tag?.trim() || "linear-calendar";
	const existing = Array.isArray(existingTags)
		? (existingTags as unknown[]).map(String)
		: (typeof existingTags === "string" || typeof existingTags === "number") ? [String(existingTags)] : [];
	const withoutGateTag = existing.filter(
		(t) => t !== "linear-calendar" && !t.startsWith("linear-calendar/"),
	);
	withoutGateTag.unshift(calendarTag);
	return withoutGateTag;
}

async function writeDragDates(
	app: App,
	filePath: string,
	mapping: ColumnMapping,
	oldStart: Date,
	newStart: Date,
	newEnd: Date,
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) return;
	await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
		fm[mapping.startDateProp] = formatISODate(newStart);
		if (formatISODate(newStart) !== formatISODate(newEnd) || fm[mapping.endDateProp]) {
			fm[mapping.endDateProp] = formatISODate(newEnd);
		}
		if (mapping.remindProp) {
			const oldRemindOn = parseDateString(fm[mapping.remindProp]);
			if (oldRemindOn) {
				fm[mapping.remindProp] = formatISODate(carryDateForward(oldStart, oldRemindOn, newStart));
			}
		}
	});
}

/**
 * Keep a "New event"-created note's filename in sync with its dateStart after a
 * drag. Only touches notes whose parent folder matches `newEventFolder` (the
 * exact same folder NoteCreator places new events in) and whose filename
 * already starts with the old date formatted per `newEventDateFormat` — that
 * dual match is what distinguishes a note actually created by that flow from
 * one that just happens to live in the same folder.
 */
async function renameForDragDateChange(
	app: App,
	filePath: string,
	cfg: EventNoteConfig,
	oldStart: Date,
	newStart: Date,
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile) || !file.parent) return;

	if (!isInEventFolder(file.parent.path, cfg)) return;

	const oldPrefix = datePrefix(oldStart, cfg);
	const newPrefix = datePrefix(newStart, cfg);
	if (oldPrefix === newPrefix) return;
	if (!hasDatePrefix(file.basename, oldStart, cfg)) return;

	const rest = file.basename.slice(oldPrefix.length);
	const parentPrefix = file.parent.path === "/" ? "" : `${file.parent.path}/`;
	const base = `${parentPrefix}${newPrefix}${rest}`;
	let newPath = normalizePath(`${base}.${file.extension}`);
	let counter = 1;
	while (newPath !== file.path && app.vault.getAbstractFileByPath(newPath)) {
		newPath = normalizePath(`${base} ${counter}.${file.extension}`);
		counter++;
	}
	if (newPath === file.path) return;

	await app.fileManager.renameFile(file, newPath);
}

/** Write a drag-committed date change to frontmatter; logs and swallows failures (drag UI has no error surface to show them). */
export async function commitDrag(
	app: App,
	mapping: ColumnMapping,
	cfg: EventNoteConfig,
	filePath: string,
	oldStart: Date,
	newStart: Date,
	newEnd: Date,
): Promise<void> {
	try {
		await writeDragDates(app, filePath, mapping, oldStart, newStart, newEnd);
		await renameForDragDateChange(app, filePath, cfg, oldStart, newStart);
	} catch (err) {
		console.error("[linear-calendar] drag write failed:", err);
	}
}
