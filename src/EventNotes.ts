import { App, Notice, TFile, normalizePath } from "obsidian";

interface TemplaterPlugin {
	templater: { write_template_to_file(template: TFile, target: TFile): Promise<void> };
}
type AppWithPlugins = App & { plugins?: { getPlugin(id: string): TemplaterPlugin | null } };
import type { PluginSettings } from "./types";
import { parseDateString, formatISODate, carryDateForward } from "./utils/dateUtils";
import { applyFields, readEventFields, type EventFields, type Frontmatter } from "./eventFields";
import {
	datePrefix, eventNoteConfig, fileBaseName, freePath, hasDatePrefix, isEventNotePath, stripDatePrefix,
	type EventNoteConfig,
} from "./utils/eventNotePath";

/**
 * `create`'s options. `openAfterCreate` is deliberately required and has no default:
 * only the user-initiated "new event" gesture wants the note opened, and every
 * internal caller (promote, duplicate, batch, edit) wants it suppressed. A default
 * either way silently does the wrong thing for the other half, which it did twice.
 */
export interface CreateOptions extends EventFields {
	/** Open the new note in the workspace after creating it. */
	openAfterCreate: boolean;
}

/**
 * Every write to an event note. Each verb resolves only once the metadata cache reflects
 * the write, so a caller that re-renders on completion sees fresh data. Verbs never throw:
 * a failure is logged, shown as a Notice, and resolves `false`.
 */
export interface EventNotes {
	/** Creates a note dated `date`. Omitted fields are left as the template (if any) set them. */
	create(date: Date, options: CreateOptions): Promise<boolean>;
	/** Rewrites an existing note's mapped fields in place (no rename, no move). Unlike `create`,
	 *  an omitted field is cleared — the modal always submits its full current state. */
	update(filePath: string, date: Date, fields: EventFields): Promise<boolean>;
	/** Applies a drag: writes the new span, carries the reminder forward by the same interval,
	 *  and renames the note when its filename carries the old date prefix. */
	move(filePath: string, oldStart: Date, newStart: Date, newEnd: Date): Promise<boolean>;
	/** Promotes a reminder ghost into a real note: duplicates the source note at `filePath` onto
	 *  the reminder's date, carries the reminder forward by the same interval, and clears the
	 *  source note's reminder field. Fails if the source note has no valid start/remind dates. */
	promoteReminder(filePath: string): Promise<boolean>;
}

/** How long to wait for the metadata cache to catch up before giving up and carrying on. */
const SETTLE_TIMEOUT_MS = 2000;

export class ObsidianEventNotes implements EventNotes {
	constructor(
		private app: App,
		/** Read at call time — settings are mutable. */
		private getSettings: () => PluginSettings,
	) {}

	async create(date: Date, options: CreateOptions): Promise<boolean> {
		try {
			const settings = this.getSettings();
			const mapping = settings.defaultMapping;
			const cfg = eventNoteConfig(settings);
			const folder = cfg.folder;

			if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
				try {
					await this.app.vault.createFolder(folder);
				} catch (err) {
					if (!this.app.vault.getAbstractFileByPath(folder)) throw err;
				}
			}

			const baseName = fileBaseName(date, options.title, cfg);
			const base = folder ? `${folder}/${baseName}` : baseName;
			const path = freePath(base, "md", (p) => !!this.app.vault.getAbstractFileByPath(p));

			const templater = (this.app as AppWithPlugins).plugins?.getPlugin("templater-obsidian");
			const templateSetting = settings.newEventTemplate;
			const templateFile = templateSetting
				? this.app.vault.getAbstractFileByPath(
					normalizePath(templateSetting.endsWith(".md") ? templateSetting : `${templateSetting}.md`),
				)
				: null;

			const file = await this.app.vault.create(path, "");
			try {
				if (templater && templateFile instanceof TFile) {
					await templater.templater.write_template_to_file(templateFile, file);
				}
				await this.write(file, (fm) => applyFields(fm, mapping, date, options, "merge"));
			} catch (err) {
				await this.app.fileManager.trashFile(file);
				throw err;
			}

			if (options.openAfterCreate) {
				await this.app.workspace.openLinkText(file.path, "", false);
			}
			return true;
		} catch (err) {
			return this.fail("create event", err);
		}
	}

	async update(filePath: string, date: Date, fields: EventFields): Promise<boolean> {
		try {
			const file = this.requireFile(filePath);
			const mapping = this.getSettings().defaultMapping;
			await this.write(file, (fm) => applyFields(fm, mapping, date, fields, "replace"));
			return true;
		} catch (err) {
			return this.fail("update event", err);
		}
	}

	async move(filePath: string, oldStart: Date, newStart: Date, newEnd: Date): Promise<boolean> {
		try {
			const file = this.requireFile(filePath);
			const settings = this.getSettings();
			const mapping = settings.defaultMapping;

			await this.write(file, (fm) => {
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
			await this.renameForNewDate(file, eventNoteConfig(settings), oldStart, newStart);
			return true;
		} catch (err) {
			return this.fail("move event", err);
		}
	}

	async promoteReminder(filePath: string): Promise<boolean> {
		try {
			const sourceFile = this.requireFile(filePath);
			const settings = this.getSettings();
			const mapping = settings.defaultMapping;
			const fm = this.app.metadataCache.getFileCache(sourceFile)?.frontmatter ?? {};

			const { date: oldDateStart, fields: read } = readEventFields(fm, mapping);
			const oldRemindOn = read.remindOn;
			if (!oldDateStart || !oldRemindOn) {
				throw new Error("source note has no valid start/remind date");
			}

			// Notes created by this plugin are named "{oldDateFormat} {title}" — strip that
			// date prefix before reusing the basename as a title, so promoting doesn't stack
			// two date prefixes into the new filename.
			const strippedBasename = stripDatePrefix(sourceFile.basename, oldDateStart, eventNoteConfig(settings));

			const title = read.title ?? strippedBasename;

			// Carry the reminder forward by the same interval, re-anchored at the new note's
			// date (oldRemindOn) — see carryDateForward for the day-of-month-vs-day-count rule.
			const newRemindOn = carryDateForward(oldDateStart, oldRemindOn, oldRemindOn);

			const created = await this.create(oldRemindOn, {
				title,
				tag: read.tag,
				icon: read.icon,
				description: read.description,
				remindOn: mapping.remindProp ? newRemindOn : undefined,
				openAfterCreate: false,
			});
			if (!created) return false;

			await this.write(sourceFile, (sourceFm) => {
				delete sourceFm[mapping.remindProp];
			});
			return true;
		} catch (err) {
			return this.fail("promote reminder", err);
		}
	}

	private requireFile(filePath: string): TFile {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) throw new Error(`not a file: ${filePath}`);
		return file;
	}

	private fail(action: string, err: unknown): false {
		console.error(`[linear-calendar] ${action} failed:`, err);
		new Notice(`Failed to ${action}.`);
		return false;
	}

	/**
	 * Runs `mutate` through processFrontMatter, then waits for the metadata cache to catch up.
	 * processFrontMatter's promise resolves once the write lands on disk, but metadataCache
	 * re-parses the frontmatter asynchronously after that — a scan run right after the await
	 * can still see the stale frontmatter and re-cache it as current. Resolves once the cached
	 * frontmatter equals what was written, or after SETTLE_TIMEOUT_MS regardless.
	 */
	private async write(file: TFile, mutate: (fm: Frontmatter) => void): Promise<void> {
		let written: Frontmatter = {};
		await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
			mutate(fm);
			written = JSON.parse(JSON.stringify(fm)) as Frontmatter;
		});

		const { metadataCache } = this.app;
		const fresh = () => matches(metadataCache.getFileCache(file)?.frontmatter ?? {}, written);
		if (fresh()) return;
		await new Promise<void>((resolve) => {
			const done = () => {
				window.clearTimeout(timer);
				metadataCache.offref(ref);
				resolve();
			};
			const timer = window.setTimeout(done, SETTLE_TIMEOUT_MS);
			const ref = metadataCache.on("changed", (changed) => {
				if (changed.path === file.path && fresh()) done();
			});
		});
	}

	/**
	 * Keep a note created by "Create event" named for its start date after a drag. Only touches
	 * notes in the event folder whose filename already starts with the old date prefix — that
	 * dual match distinguishes a note created by that flow from one that merely sits there.
	 */
	private async renameForNewDate(file: TFile, cfg: EventNoteConfig, oldStart: Date, newStart: Date): Promise<void> {
		if (!file.parent || !isEventNotePath(file.path, cfg)) return;

		const oldPrefix = datePrefix(oldStart, cfg);
		const newPrefix = datePrefix(newStart, cfg);
		if (oldPrefix === newPrefix) return;
		if (!hasDatePrefix(file.basename, oldStart, cfg)) return;

		const rest = file.basename.slice(oldPrefix.length);
		const parentPrefix = file.parent.path === "/" ? "" : `${file.parent.path}/`;
		const base = `${parentPrefix}${newPrefix}${rest}`;
		const newPath = freePath(base, file.extension, (p) => !!this.app.vault.getAbstractFileByPath(p), file.path);
		if (newPath === file.path) return;

		await this.app.fileManager.renameFile(file, newPath);
	}
}

/** Whether the cached frontmatter holds exactly the keys and values in `written` (Obsidian's own `position` key aside). */
function matches(cached: Frontmatter, written: Frontmatter): boolean {
	const cachedKeys = Object.keys(cached).filter((k) => k !== "position");
	if (cachedKeys.length !== Object.keys(written).length) return false;
	return cachedKeys.every((k) => k in written && JSON.stringify(cached[k]) === JSON.stringify(written[k]));
}
