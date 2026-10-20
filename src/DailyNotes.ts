import { debounce, moment, normalizePath, TFile, TFolder, Vault } from "obsidian";
import type { App, Component, Debouncer, TAbstractFile } from "obsidian";
import { formatISODate } from "./utils/dateUtils";

interface DailyPluginSettings {
	daily?: { enabled: boolean; format?: string; folder?: string; template?: string };
}

interface ObsidianPlugins {
	getPlugin(id: string): { settings?: DailyPluginSettings } | null;
}

interface CoreDailyNoteOptions {
	format?: string;
	folder?: string;
	template?: string;
}

interface ObsidianInternalPlugins {
	getPluginById(id: string): { instance?: { options?: CoreDailyNoteOptions } } | null;
}

interface AppInternal extends App {
	plugins: ObsidianPlugins;
	internalPlugins: ObsidianInternalPlugins;
}

/** Quiet period before subscribers hear about a burst of vault events. */
const CHANGE_DEBOUNCE_MS = 300;

type MomentLike = (s: string, fmt: string, strict: boolean) => { isValid(): boolean; format(f: string): string };
type MomentAt = (d: Date) => { format(f: string): string };

function getDailyNoteSettings(app: App): { folder: string; format: string; template: string } {
	const defaultFormat = "YYYY-MM-DD";
	try {
		const { plugins, internalPlugins } = app as AppInternal;

		// 1. obsidian-calendar-notes (personal plugin replacing lhak-periodic-notes / periodic-notes)
		const calendarNotes = plugins?.getPlugin("obsidian-calendar-notes");
		if (calendarNotes?.settings?.daily?.enabled) {
			const { format, folder, template } = calendarNotes.settings.daily;
			return { format: format || defaultFormat, folder: (folder || "").trim(), template: (template || "").trim() };
		}

		// 2. built-in daily-notes core plugin
		const opts = internalPlugins?.getPluginById("daily-notes")?.instance?.options ?? {};
		return { format: opts.format || defaultFormat, folder: (opts.folder || "").trim(), template: (opts.template || "").trim() };
	} catch {
		return { folder: "", format: defaultFormat, template: "" };
	}
}

/**
 * The vault's daily notes, looked up by calendar day. Months are 0-based, like `Date`.
 *
 * The folder and format come from another plugin's settings, which fire no event, so every
 * `get` compares them with the ones the index was built from and rebuilds when they differ.
 * Vault events that touch a markdown file under the daily-note folder drop the index; it is
 * rebuilt on the next `get`, and subscribers hear about it (debounced) so they can repaint.
 */
export class DailyNotes {
	private index: Map<string, TFile> | null = null;
	/** `folder|format` the index was built from. */
	private builtWith = "";
	private subscribers = new Set<() => void>();
	private notifySubscribers: Debouncer<[], void>;

	/** `owner` scopes the vault listeners and the pending notification to its unload. */
	constructor(private app: App, owner: Component) {
		this.notifySubscribers = debounce(() => {
			for (const cb of [...this.subscribers]) cb();
		}, CHANGE_DEBOUNCE_MS, true);

		const touch = (file: TAbstractFile, oldPath?: string) => {
			if (!this.touchesDailyFolder(file, file.path) && !(oldPath !== undefined && this.touchesDailyFolder(file, oldPath))) return;
			this.index = null;
			this.notifySubscribers();
		};
		owner.registerEvent(app.vault.on("create", (file) => touch(file)));
		owner.registerEvent(app.vault.on("delete", (file) => touch(file)));
		owner.registerEvent(app.vault.on("rename", (file, oldPath) => touch(file, oldPath)));
		owner.register(() => this.notifySubscribers.cancel());
	}

	get(year: number, month: number, day: number): TFile | undefined {
		return this.ensureIndex().get(formatISODate(new Date(year, month, day)));
	}

	/** Creates the day's note from the daily-note template. Throws like `vault.create` if it already exists. */
	async create(year: number, month: number, day: number): Promise<TFile> {
		const { folder, format, template } = getDailyNoteSettings(this.app);
		const { vault } = this.app;
		const filename = (moment as unknown as MomentAt)(new Date(year, month, day)).format(format);

		if (folder) {
			const normalizedFolder = normalizePath(folder);
			if (!vault.getAbstractFileByPath(normalizedFolder)) {
				await vault.createFolder(normalizedFolder);
			}
		}

		let content = "";
		if (template) {
			const templatePath = normalizePath(template.endsWith(".md") ? template : `${template}.md`);
			const templateFile = vault.getAbstractFileByPath(templatePath);
			if (templateFile instanceof TFile) {
				const raw = await vault.read(templateFile);
				const now = (moment as unknown as () => { format(f: string): string })();
				content = raw
					.replace(/{{\s*date\s*}}/gi, filename)
					.replace(/{{\s*time\s*}}/gi, now.format("HH:mm"))
					.replace(/{{\s*title\s*}}/gi, filename);
			}
		}

		const filePath = folder
			? normalizePath(`${folder}/${filename}.md`)
			: normalizePath(`${filename}.md`);

		const file = await vault.create(filePath, content);
		// Visible to the very next `get`, without waiting on the vault's own create event.
		if (this.index && this.builtWith === `${folder}|${format}`) {
			this.index.set(formatISODate(new Date(year, month, day)), file);
		}
		return file;
	}

	/**
	 * Calls `cb` (debounced, no arguments) after daily notes may have changed: a markdown file
	 * under the daily-note folder was created, deleted or renamed. Repaint by calling `get` again.
	 * Returns the unsubscribe.
	 */
	onChange(cb: () => void): () => void {
		this.subscribers.add(cb);
		return () => { this.subscribers.delete(cb); };
	}

	private ensureIndex(): Map<string, TFile> {
		const { folder, format } = getDailyNoteSettings(this.app);
		const sig = `${folder}|${format}`;
		if (this.index && this.builtWith === sig) return this.index;

		const result = new Map<string, TFile>();
		const folderAbstract = folder
			? this.app.vault.getAbstractFileByPath(normalizePath(folder))
			: this.app.vault.getRoot();

		if (folderAbstract instanceof TFolder) {
			Vault.recurseChildren(folderAbstract, (file) => {
				if (!(file instanceof TFile) || file.extension !== "md") return;
				const date = (moment as unknown as MomentLike)(file.basename, format, true);
				if (date.isValid()) result.set(date.format("YYYY-MM-DD"), file);
			});
		}

		this.index = result;
		this.builtWith = sig;
		return result;
	}

	/**
	 * Whether `file` at `path` is a markdown file under the daily-note folder, or a folder that
	 * is, or contains, that folder (a folder delete/rename moves its notes without per-file events).
	 */
	private touchesDailyFolder(file: TAbstractFile, path: string): boolean {
		const folder = normalizePath(getDailyNoteSettings(this.app).folder);
		const rootFolder = folder === "/" || folder === "";
		const under = (p: string, dir: string) => rootFolder || p === dir || p.startsWith(`${dir}/`);

		if (file instanceof TFolder) return under(path, folder) || (!rootFolder && folder.startsWith(`${path}/`));
		return path.endsWith(".md") && under(path, folder);
	}
}
