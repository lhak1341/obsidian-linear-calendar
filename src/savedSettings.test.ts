import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./constants";
import { settingsFromSaved } from "./savedSettings";

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

	it("keeps saved tag icons and colours", () => {
		const settings = settingsFromSaved({
			iconMap: { travel: "plane", health: "flask-conical" },
			colorMap: { travel: "#039BE5" },
		});
		expect(settings.iconMap).toEqual({ travel: "plane", health: "flask-conical" });
		expect(settings.colorMap).toEqual({ travel: "#039BE5" });
	});

	it("fills a partly saved column mapping from the defaults", () => {
		const settings = settingsFromSaved({ defaultMapping: { startDateProp: "start" } });
		expect(settings.defaultMapping).toEqual({ ...DEFAULT_SETTINGS.defaultMapping, startDateProp: "start" });
	});

	it("never shares a nested map with the defaults", () => {
		const settings = settingsFromSaved({});
		settings.iconMap.travel = "plane";
		settings.colorMap.travel = "#039BE5";
		settings.defaultMapping.titleProp = "title";
		expect(DEFAULT_SETTINGS.iconMap).toEqual({});
		expect(DEFAULT_SETTINGS.colorMap).toEqual({});
		expect(DEFAULT_SETTINGS.defaultMapping.titleProp).toBe("__filename__");
	});
});
