import { parseFontRoleSettings } from "@lhak/style/obsidian-helpers/font-roles";
import { DEFAULT_SETTINGS } from "./constants";
import type { PluginSettings } from "./types";

/**
 * The plugin's settings from its saved data (`loadData()`), filled from the defaults.
 * Font keys go through the shared font-role helper, which reads LCAL's old `"plugin"`
 * choice (and anything unknown) as `"default"`; both meant "follow the theme".
 * Nested maps are fresh copies, so editing them never reaches `DEFAULT_SETTINGS`.
 */
export function settingsFromSaved(saved: unknown): PluginSettings {
	const data = (typeof saved === "object" && saved !== null ? saved : {}) as Partial<PluginSettings>;
	return {
		...DEFAULT_SETTINGS,
		...data,
		defaultMapping: { ...DEFAULT_SETTINGS.defaultMapping, ...data.defaultMapping },
		colorMap: { ...data.colorMap },
		iconMap: { ...data.iconMap },
		...parseFontRoleSettings(data),
	};
}
