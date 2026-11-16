import { getAllTags, type App } from "obsidian";

/** Names the vault already uses, for the settings tab's suggestions and warnings. */
export interface VaultNames {
	/** Calendar tags any note carries (`linear-calendar/...`, no `#`), in any year. */
	calendarTags: Set<string>;
	/** Frontmatter keys any note uses, sorted. */
	properties: string[];
	/** Folder paths, sorted. */
	folders: string[];
	/** Markdown file paths, sorted. */
	files: string[];
}

/** One pass over the vault's metadata cache. The settings tab reads it once per render. */
export function readVaultNames(app: App): VaultNames {
	const calendarTags = new Set<string>();
	const properties = new Set<string>();
	const files: string[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		files.push(file.path);
		const cache = app.metadataCache.getFileCache(file);
		if (!cache) continue;
		for (const key of Object.keys(cache.frontmatter ?? {})) properties.add(key);
		for (const tag of getAllTags(cache) ?? []) {
			if (tag.startsWith("#linear-calendar/")) calendarTags.add(tag.slice(1));
		}
	}
	const folders = app.vault.getAllFolders(false).map((f) => f.path);
	const byName = (a: string, b: string) => a.localeCompare(b);
	return { calendarTags, properties: [...properties].sort(byName), folders: folders.sort(byName), files: files.sort(byName) };
}
