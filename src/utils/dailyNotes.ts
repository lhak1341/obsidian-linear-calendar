import { App, moment, normalizePath, TFile, TFolder, Vault } from "obsidian";

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

export async function createDailyNote(app: App, year: number, month: number, day: number): Promise<TFile> {
	const { folder, format, template } = getDailyNoteSettings(app);
	const date = (moment as unknown as (d: Date) => { format(f: string): string })(new Date(year, month, day));
	const filename = date.format(format);

	if (folder) {
		const normalizedFolder = normalizePath(folder);
		if (!app.vault.getAbstractFileByPath(normalizedFolder)) {
			await app.vault.createFolder(normalizedFolder);
		}
	}

	let content = "";
	if (template) {
		const templatePath = normalizePath(template.endsWith(".md") ? template : `${template}.md`);
		const templateFile = app.vault.getAbstractFileByPath(templatePath);
		if (templateFile instanceof TFile) {
			const raw = await app.vault.read(templateFile);
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

	return await app.vault.create(filePath, content);
}

export function getDailyNoteMap(app: App): Map<string, TFile> {
	const { folder, format } = getDailyNoteSettings(app);
	const result = new Map<string, TFile>();

	const folderAbstract = folder
		? app.vault.getAbstractFileByPath(normalizePath(folder))
		: app.vault.getRoot();

	if (!(folderAbstract instanceof TFolder)) return result;

	Vault.recurseChildren(folderAbstract, (file) => {
		if (!(file instanceof TFile) || file.extension !== "md") return;
		const date = (moment as unknown as (s: string, fmt: string, strict: boolean) => { isValid(): boolean; format(f: string): string })(file.basename, format, true);
		if (date.isValid()) {
			result.set(date.format("YYYY-MM-DD"), file);
		}
	});

	return result;
}
