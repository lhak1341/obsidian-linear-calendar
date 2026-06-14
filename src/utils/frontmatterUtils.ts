import { App, TFile } from "obsidian";
import type { ColumnMapping } from "../types";

export async function writeDragDates(
	app: App,
	filePath: string,
	mapping: ColumnMapping,
	newStart: Date,
	newEnd: Date,
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) return;
	const pad = (n: number) => String(n).padStart(2, "0");
	const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm[mapping.startDateProp] = fmt(newStart);
		if (fmt(newStart) !== fmt(newEnd) || fm[mapping.endDateProp]) {
			fm[mapping.endDateProp] = fmt(newEnd);
		}
	});
}
