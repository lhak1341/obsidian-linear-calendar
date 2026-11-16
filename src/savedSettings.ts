import { parseFontRoleSettings } from "@lhak/style/obsidian-helpers/font-roles";
import { DEFAULT_SETTINGS } from "./constants";
import type { PluginSettings, TagHue } from "./types";
import { tagHueFromSaved } from "./utils/colorUtils";

/**
 * The plugin's settings from its saved data (`loadData()`), filled from the defaults.
 * Font keys go through the shared font-role helper, which reads LCAL's old `"plugin"`
 * choice (and anything unknown) as `"default"`; both meant "follow the theme".
 * Tag colours are hue names or grey: a saved hex colour (the old Google palette or the free
 * colour picker) reads as grey when near-neutral, else as its `nearestHue`, and one no hue can
 * stand for is dropped, so the tag takes an automatic hue. Nested maps are fresh copies, so
 * editing them never reaches `DEFAULT_SETTINGS`.
 */
export function settingsFromSaved(saved: unknown): PluginSettings {
	const data = (typeof saved === "object" && saved !== null ? saved : {}) as Partial<PluginSettings>;
	return {
		...DEFAULT_SETTINGS,
		...data,
		defaultMapping: { ...DEFAULT_SETTINGS.defaultMapping, ...data.defaultMapping },
		colorMap: huesFromSaved(data.colorMap),
		iconMap: { ...data.iconMap },
		...parseFontRoleSettings(data),
	};
}

/** The plugin's saved-data store: `Plugin.loadData`/`saveData`. */
export interface SavedDataStore {
	loadData(): Promise<unknown>;
	saveData(data: unknown): Promise<void>;
}

/**
 * Loads the settings and, when a saved tag colour was not yet a hue name, writes the
 * migrated settings back, so the hex-to-hue migration runs once.
 */
export async function loadSettingsFrom(store: SavedDataStore): Promise<PluginSettings> {
	const saved = await store.loadData();
	const settings = settingsFromSaved(saved);
	if (!sameColours(savedColorMap(saved), settings.colorMap)) await store.saveData(settings);
	return settings;
}

function huesFromSaved(saved: Record<string, unknown> | undefined): Record<string, TagHue> {
	const hues: Record<string, TagHue> = {};
	for (const [tag, colour] of Object.entries(saved ?? {})) {
		const hue = tagHueFromSaved(colour);
		if (hue) hues[tag] = hue;
	}
	return hues;
}

function savedColorMap(saved: unknown): Record<string, unknown> {
	const colorMap = typeof saved === "object" && saved !== null ? (saved as { colorMap?: unknown }).colorMap : undefined;
	return typeof colorMap === "object" && colorMap !== null ? (colorMap as Record<string, unknown>) : {};
}

function sameColours(saved: Record<string, unknown>, hues: Record<string, TagHue>): boolean {
	const tags = Object.keys(saved);
	return tags.length === Object.keys(hues).length && tags.every((tag) => saved[tag] === hues[tag]);
}
