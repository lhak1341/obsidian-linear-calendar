import { App, Notice, TFile, moment, normalizePath } from "obsidian";

interface TemplaterPlugin {
	templater: { write_template_to_file(template: TFile, target: TFile): Promise<void> };
}
type AppWithPlugins = App & { plugins?: { getPlugin(id: string): TemplaterPlugin | null } };
import type { PluginSettings, ColumnMapping } from "./types";

export interface CreateEventOptions {
	title?: string;
	/** Full subtag, e.g. "linear-calendar/work". Omit for the bare "linear-calendar" gate tag. */
	tag?: string;
	anniversary?: boolean;
	icon?: string;
	dateEnd?: Date;
	description?: string;
}

export interface NoteCreator {
	create(date: Date, options?: CreateEventOptions): Promise<void>;
}

export class ObsidianNoteCreator implements NoteCreator {
	constructor(
		private app: App,
		private settings: PluginSettings,
		private getMapping: () => ColumnMapping,
	) {}

	async create(date: Date, options: CreateEventOptions = {}): Promise<void> {
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

			const trimmedTitle = options.title?.trim();
			// Filenames can't contain these characters on any OS Obsidian runs on.
			const safeTitle = trimmedTitle ? trimmedTitle.replace(/[\\/:*?"<>|]/g, "-") : "Untitled";
			const calendarTag = options.tag?.trim() || "linear-calendar";
			const trimmedIcon = options.icon?.trim();
			const trimmedDescription = options.description?.trim();
			const endDateStr = options.dateEnd
				? `${options.dateEnd.getFullYear()}-${pad(options.dateEnd.getMonth() + 1)}-${pad(options.dateEnd.getDate())}`
				: undefined;

			if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
				try {
					await this.app.vault.createFolder(folder);
				} catch (err) {
					if (!this.app.vault.getAbstractFileByPath(folder)) throw err;
				}
			}

			const base = folder ? `${folder}/${datePart} ${safeTitle}` : `${datePart} ${safeTitle}`;
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
					if (endDateStr) fm[mapping.endDateProp] = endDateStr;
					if (mapping.titleProp !== "__filename__" && trimmedTitle) fm[mapping.titleProp] = trimmedTitle;
					if (trimmedIcon && mapping.iconProp) fm[mapping.iconProp] = trimmedIcon;
					if (trimmedDescription && mapping.descriptionProp) fm[mapping.descriptionProp] = trimmedDescription;
					if (options.anniversary && mapping.anniversaryProp) fm[mapping.anniversaryProp] = true;
					const existing = Array.isArray(fm.tags)
						? (fm.tags as unknown[]).map(String)
						: (typeof fm.tags === "string" || typeof fm.tags === "number") ? [String(fm.tags)] : [];
					if (!existing.includes(calendarTag)) existing.unshift(calendarTag);
					fm.tags = existing;
				});
			} else {
				const lines = ["---", `tags: [${calendarTag}]`, `${mapping.startDateProp}: ${dateStr}`];
				if (endDateStr) lines.push(`${mapping.endDateProp}: ${endDateStr}`);
				if (mapping.titleProp !== "__filename__" && trimmedTitle) lines.push(`${mapping.titleProp}: ${trimmedTitle}`);
				if (trimmedIcon && mapping.iconProp) lines.push(`${mapping.iconProp}: ${trimmedIcon}`);
				if (trimmedDescription && mapping.descriptionProp) {
					lines.push(`${mapping.descriptionProp}: ${JSON.stringify(trimmedDescription)}`);
				}
				if (options.anniversary && mapping.anniversaryProp) lines.push(`${mapping.anniversaryProp}: true`);
				lines.push("---", "");
				file = await this.app.vault.create(path, lines.join("\n"));
			}

			await this.app.workspace.openLinkText(file.path, "", false);
		} catch (err) {
			console.error("[linear-calendar] create event failed:", err);
			new Notice("Failed to create event note.");
		}
	}
}
