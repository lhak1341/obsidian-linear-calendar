import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "./constants";
import { loadSettingsFrom, settingsFromSaved } from "./savedSettings";

describe("settingsFromSaved", () => {
	it("reads nothing saved as the defaults, with fonts following the theme", () => {
		const settings = settingsFromSaved(undefined);
		expect(settings).toEqual(DEFAULT_SETTINGS);
		expect([settings.fontHeading, settings.fontBody, settings.fontMono]).toEqual(["default", "default", "default"]);
	});

	it("keeps saved font choices through the switch to the shared font-role helper", () => {
		const settings = settingsFromSaved({
			fontHeading: "custom",
			fontHeadingCustom: "Space Grotesk",
			fontBody: "obsidian-text",
			fontBodyCustom: "",
			fontMono: "obsidian-monospace",
			fontMonoCustom: "Maple Mono",
		});
		expect(settings).toMatchObject({
			fontHeading: "custom",
			fontHeadingCustom: "Space Grotesk",
			fontBody: "obsidian-text",
			fontMono: "obsidian-monospace",
			fontMonoCustom: "Maple Mono",
		});
	});

	it("reads the old \"plugin\" default choice as the shared default", () => {
		const settings = settingsFromSaved({ fontHeading: "plugin", fontBody: "plugin", fontMono: "plugin" });
		expect([settings.fontHeading, settings.fontBody, settings.fontMono]).toEqual(["default", "default", "default"]);
	});

	it("keeps saved tag icons and hue names", () => {
		const settings = settingsFromSaved({
			iconMap: { travel: "plane", health: "flask-conical" },
			colorMap: { travel: "yellow", health: "red" },
		});
		expect(settings.iconMap).toEqual({ travel: "plane", health: "flask-conical" });
		expect(settings.colorMap).toEqual({ travel: "yellow", health: "red" });
	});

	it("fills a partly saved column mapping from the defaults", () => {
		const settings = settingsFromSaved({ defaultMapping: { startDateProp: "start" } });
		expect(settings.defaultMapping).toEqual({ ...DEFAULT_SETTINGS.defaultMapping, startDateProp: "start" });
	});

	it("never shares a nested map with the defaults", () => {
		const settings = settingsFromSaved({});
		settings.iconMap.travel = "plane";
		settings.colorMap.travel = "blue";
		settings.defaultMapping.titleProp = "title";
		expect(DEFAULT_SETTINGS.iconMap).toEqual({});
		expect(DEFAULT_SETTINGS.colorMap).toEqual({});
		expect(DEFAULT_SETTINGS.defaultMapping.titleProp).toBe("__filename__");
	});
});

/** A plugin's saved-data store whose save is a spy. */
function store(saved: unknown) {
	return { loadData: vi.fn(async () => saved), saveData: vi.fn(async (_data: unknown) => {}) };
}

describe("loadSettingsFrom", () => {
	it("maps saved hex colours to the nearest hue and writes them back once", async () => {
		// Expected hues: the @lhak/style nearestHue cases for the old Google palette.
		const plugin = store({ colorMap: { travel: "#F6BF26", work: "#039BE5", pet: "#E67C73", mori: "#616161" } });
		const settings = await loadSettingsFrom(plugin);
		const migrated = { travel: "yellow", work: "blue", pet: "orange", mori: "cyan" };
		expect(settings.colorMap).toEqual(migrated);
		expect(plugin.saveData).toHaveBeenCalledTimes(1);
		expect(plugin.saveData.mock.calls[0]?.[0]).toMatchObject({ colorMap: migrated });
	});

	it("does not save again once the colours are hue names", async () => {
		const first = store({ colorMap: { travel: "#F6BF26" }, iconMap: { travel: "plane" } });
		await loadSettingsFrom(first);
		const second = store(first.saveData.mock.calls[0]?.[0]);
		const settings = await loadSettingsFrom(second);
		expect(settings.colorMap).toEqual({ travel: "yellow" });
		expect(second.saveData).not.toHaveBeenCalled();
	});

	it("does not save when nothing was saved yet", async () => {
		const plugin = store(null);
		expect(await loadSettingsFrom(plugin)).toEqual(DEFAULT_SETTINGS);
		expect(plugin.saveData).not.toHaveBeenCalled();
	});

	it("drops a saved colour no hue can stand for, so the tag takes an automatic hue", async () => {
		const plugin = store({ colorMap: { travel: "tomato", work: "blue" } });
		const settings = await loadSettingsFrom(plugin);
		expect(settings.colorMap).toEqual({ work: "blue" });
		expect(plugin.saveData).toHaveBeenCalledTimes(1);
	});
});
