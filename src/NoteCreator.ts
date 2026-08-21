import { App, Notice, TFile, moment, normalizePath } from "obsidian";

interface TemplaterPlugin {
	templater: { write_template_to_file(template: TFile, target: TFile): Promise<void> };
}
type AppWithPlugins = App & { plugins?: { getPlugin(id: string): TemplaterPlugin | null } };
import type { PluginSettings, ColumnMapping } from "./types";
import { parseDateString, formatISODate, daysBetween, monthsBetween, addMonthsClamped } from "./utils/dateUtils";

export interface CreateEventOptions {
	title?: string;
	/** Full subtag, e.g. "linear-calendar/work". Omit for the bare "linear-calendar" gate tag. */
	tag?: string;
	anniversary?: boolean;
	icon?: string;
	dateEnd?: Date;
	description?: string;
	/** Extra frontmatter written verbatim (key: raw value string) after the standard fields. */
	extraFrontmatter?: Record<string, string>;
	/** Open the new note in the workspace after creating it. Default true. */
	openAfterCreate?: boolean;
}

export interface NoteCreator {
	/** Returns true once the note is written; false (after logging + a Notice) if creation failed. */
	create(date: Date, options?: CreateEventOptions): Promise<boolean>;
	/** Promotes a reminder ghost into a real note: duplicates the source note at `filePath` onto
	 *  the reminder's date, carries the reminder forward by the same interval, and clears the
	 *  source note's reminder field. No-op if the source note has no valid start/remind dates. */
	promoteReminder(filePath: string): Promise<void>;
}

export class ObsidianNoteCreator implements NoteCreator {
	constructor(
		private app: App,
		private settings: PluginSettings,
		private getMapping: () => ColumnMapping,
	) {}

	async create(date: Date, options: CreateEventOptions = {}): Promise<boolean> {
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
					if (options.extraFrontmatter) {
						for (const [key, value] of Object.entries(options.extraFrontmatter)) fm[key] = value;
					}
					const existing = Array.isArray(fm.tags)
						? (fm.tags as unknown[]).map(String)
						: (typeof fm.tags === "string" || typeof fm.tags === "number") ? [String(fm.tags)] : [];
					const withoutGateTag = existing.filter(
						(t) => t !== "linear-calendar" && !t.startsWith("linear-calendar/"),
					);
					withoutGateTag.unshift(calendarTag);
					fm.tags = withoutGateTag;
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
				if (options.extraFrontmatter) {
					for (const [key, value] of Object.entries(options.extraFrontmatter)) lines.push(`${key}: ${value}`);
				}
				lines.push("---", "");
				file = await this.app.vault.create(path, lines.join("\n"));
			}

			if (options.openAfterCreate ?? true) {
				await this.app.workspace.openLinkText(file.path, "", false);
			}
			return true;
		} catch (err) {
			console.error("[linear-calendar] create event failed:", err);
			new Notice("Failed to create event note.");
			return false;
		}
	}

	async promoteReminder(filePath: string): Promise<void> {
		try {
			const sourceFile = this.app.vault.getAbstractFileByPath(filePath);
			if (!(sourceFile instanceof TFile)) return;

			const mapping = this.getMapping();
			const fm = this.app.metadataCache.getFileCache(sourceFile)?.frontmatter ?? {};

			const oldDateStart = parseDateString(fm[mapping.startDateProp]);
			const oldRemindOn = mapping.remindProp ? parseDateString(fm[mapping.remindProp]) : null;
			if (!oldDateStart || !oldRemindOn) {
				console.error("[linear-calendar] promote reminder failed: source note has no valid start/remind date", filePath);
				new Notice("Failed to promote reminder: note's date fields are missing or invalid.");
				return;
			}

			// Notes created by this plugin are named "{oldDateFormat} {title}" — strip that
			// date prefix before reusing the basename as a title, so promoting doesn't stack
			// two date prefixes into the new filename.
			const dateFmt = this.settings.newEventDateFormat || "YYYY-MM-DD";
			const formatMoment = (d: Date) => (moment as unknown as (dt: Date) => { format(f: string): string })(d).format(dateFmt);
			const oldPrefix = formatMoment(oldDateStart);
			const strippedBasename = sourceFile.basename.startsWith(`${oldPrefix} `)
				? sourceFile.basename.slice(oldPrefix.length + 1)
				: sourceFile.basename;

			const title = mapping.titleProp === "__filename__"
				? strippedBasename
				: typeof fm[mapping.titleProp] === "string" ? (fm[mapping.titleProp] as string) : strippedBasename;

			const tagsRaw = Array.isArray(fm.tags)
				? (fm.tags as unknown[]).map(String)
				: typeof fm.tags === "string" ? [fm.tags] : [];
			const tag = tagsRaw.find((t) => t === "linear-calendar" || t.startsWith("linear-calendar/"));

			const icon = mapping.iconProp && typeof fm[mapping.iconProp] === "string"
				? (fm[mapping.iconProp] as string)
				: undefined;
			const description = mapping.descriptionProp && typeof fm[mapping.descriptionProp] === "string"
				? (fm[mapping.descriptionProp] as string)
				: undefined;

			// Carry the reminder forward by the same interval, from the new date. When the
			// reminder landed on the same day-of-month as the source (the "in N months/years"
			// case), reapply it as calendar months so e.g. the 21st stays the 21st forever —
			// a fixed day-count would drift once months of different lengths stack up.
			// Otherwise (day/week-based intervals) whole calendar days, DST-safe.
			const monthDiff = monthsBetween(oldDateStart, oldRemindOn);
			const newRemindOn = oldDateStart.getDate() === oldRemindOn.getDate() && monthDiff > 0
				? addMonthsClamped(oldRemindOn, monthDiff)
				: new Date(
					oldRemindOn.getFullYear(),
					oldRemindOn.getMonth(),
					oldRemindOn.getDate() + daysBetween(oldDateStart, oldRemindOn),
				);

			const created = await this.create(oldRemindOn, {
				title,
				tag,
				icon,
				description,
				extraFrontmatter: mapping.remindProp ? { [mapping.remindProp]: formatISODate(newRemindOn) } : undefined,
			});
			if (!created) return;

			await this.app.fileManager.processFrontMatter(sourceFile, (sourceFm: Record<string, unknown>) => {
				delete sourceFm[mapping.remindProp];
			});
		} catch (err) {
			console.error("[linear-calendar] promote reminder failed:", err);
			new Notice("Failed to promote reminder.");
		}
	}
}
