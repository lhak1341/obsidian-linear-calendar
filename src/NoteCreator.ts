import { App, Notice, TFile, moment, normalizePath } from "obsidian";

interface TemplaterPlugin {
	templater: { write_template_to_file(template: TFile, target: TFile): Promise<void> };
}
type AppWithPlugins = App & { plugins?: { getPlugin(id: string): TemplaterPlugin | null } };
import type { PluginSettings, ColumnMapping } from "./types";

export interface NoteCreator {
	create(date: Date): Promise<void>;
}

export class ObsidianNoteCreator implements NoteCreator {
	constructor(
		private app: App,
		private settings: PluginSettings,
		private getMapping: () => ColumnMapping,
	) {}

	async create(date: Date): Promise<void> {
		try {
			const year = date.getFullYear();
			const month = date.getMonth();
			const day = date.getDate();
			const pad = (n: number) => String(n).padStart(2, "0");
			const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
			const mapping = this.getMapping();
			const folder = this.settings.newEventFolder;
			const fmt = this.settings.newEventDateFormat || "YYYY-MM-DD";
			const datePart = (moment as unknown as (d: Date) => { format(f: string): string })(date).format(fmt);

			if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
				try {
					await this.app.vault.createFolder(folder);
				} catch (err) {
					if (!this.app.vault.getAbstractFileByPath(folder)) throw err;
				}
			}

			const base = folder ? `${folder}/${datePart} Untitled` : `${datePart} Untitled`;
			let path = normalizePath(`${base}.md`);
			let counter = 1;
			while (this.app.vault.getAbstractFileByPath(path)) {
				path = normalizePath(`${base} ${counter}.md`);
				counter++;
			}

			const templater = (this.app as AppWithPlugins).plugins?.getPlugin("templater-obsidian");
			const templateSetting = this.settings.newEventTemplate;
			const templateFile = templateSetting
				? this.app.vault.getAbstractFileByPath(
					normalizePath(templateSetting.endsWith(".md") ? templateSetting : `${templateSetting}.md`),
				)
				: null;

			let file: TFile;
			if (templater && templateFile instanceof TFile) {
				file = await this.app.vault.create(path, "");
				try {
					await templater.templater.write_template_to_file(templateFile, file);
				} catch (err) {
					await this.app.fileManager.trashFile(file);
					throw err;
				}
				await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
					fm[mapping.startDateProp] = dateStr;
					const existing = Array.isArray(fm.tags)
						? (fm.tags as unknown[]).map(String)
						: (typeof fm.tags === "string" || typeof fm.tags === "number") ? [String(fm.tags)] : [];
					if (!existing.includes("linear-calendar")) existing.unshift("linear-calendar");
					fm.tags = existing;
				});
			} else {
				const frontmatter = [
					"---",
					`tags: [linear-calendar]`,
					`${mapping.startDateProp}: ${dateStr}`,
					"---",
					"",
				].join("\n");
				file = await this.app.vault.create(path, frontmatter);
			}

			await this.app.workspace.openLinkText(file.path, "", false);
		} catch (err) {
			console.error("[linear-calendar] create event failed:", err);
			new Notice("Failed to create event note.");
		}
	}
}
