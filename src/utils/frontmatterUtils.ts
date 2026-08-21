import { App, TFile, moment, normalizePath } from "obsidian";
import type { ColumnMapping } from "../types";
import { carryDateForward, formatISODate, parseDateString } from "./dateUtils";

const formatDate = (d: Date, fmt: string) =>
	(moment as unknown as (date: Date) => { format(f: string): string })(d).format(fmt);

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
	const pad = (n: number) => String(n).padStart(2, "0");
	const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
		fm[mapping.startDateProp] = fmt(newStart);
		if (fmt(newStart) !== fmt(newEnd) || fm[mapping.endDateProp]) {
			fm[mapping.endDateProp] = fmt(newEnd);
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
	newEventFolder: string,
	newEventDateFormat: string,
	oldStart: Date,
	newStart: Date,
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile) || !file.parent) return;

	const expectedParent = newEventFolder ? normalizePath(newEventFolder) : "/";
	if (file.parent.path !== expectedParent) return;

	const fmt = newEventDateFormat || "YYYY-MM-DD";
	const oldPrefix = formatDate(oldStart, fmt);
	const newPrefix = formatDate(newStart, fmt);
	if (oldPrefix === newPrefix) return;
	if (!file.basename.startsWith(`${oldPrefix} `)) return;

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
	newEventFolder: string,
	newEventDateFormat: string,
	filePath: string,
	oldStart: Date,
	newStart: Date,
	newEnd: Date,
): Promise<void> {
	try {
		await writeDragDates(app, filePath, mapping, oldStart, newStart, newEnd);
		await renameForDragDateChange(app, filePath, newEventFolder, newEventDateFormat, oldStart, newStart);
	} catch (err) {
		console.error("[linear-calendar] drag write failed:", err);
	}
}
