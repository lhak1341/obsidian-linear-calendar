import { App, normalizePath, TFile, TFolder, Vault } from "obsidian";

function getDailyNoteSettings(app: App): { folder: string; format: string } {
	const defaultFormat = "YYYY-MM-DD";
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const plugins = (app as any).plugins;

		// 1. lhak-periodic-notes (fork)
		const lhakPN = plugins?.getPlugin("lhak-periodic-notes");
		if (lhakPN?.settings?.daily?.enabled) {
			const { format, folder } = lhakPN.settings.daily;
			return { format: format || defaultFormat, folder: (folder || "").trim() };
		}

		// 2. periodic-notes (original)
		const periodicNotes = plugins?.getPlugin("periodic-notes");
		if (periodicNotes?.settings?.daily?.enabled) {
			const { format, folder } = periodicNotes.settings.daily;
			return { format: format || defaultFormat, folder: (folder || "").trim() };
		}

		// 3. built-in daily-notes core plugin
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const opts = (app as any).internalPlugins?.getPluginById("daily-notes")?.instance?.options ?? {};
		return { format: opts.format || defaultFormat, folder: (opts.folder || "").trim() };
	} catch {
		return { folder: "", format: defaultFormat };
	}
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
		const date = window.moment(file.basename, format, true);
		if (date.isValid()) {
			result.set(date.format("YYYY-MM-DD"), file);
		}
	});

	return result;
}
