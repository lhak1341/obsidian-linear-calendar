import { describe, it, expect } from "vitest";
import { datePrefix, fileBaseName, isInEventFolder, hasDatePrefix, stripDatePrefix, eventNoteConfig } from "./eventNotePath";

const cfg = { folder: "Events", format: "YYYY-MM-DD" };
const d = new Date(2026, 2, 1);

describe("datePrefix", () => {
	it("formats per cfg.format", () => {
		expect(datePrefix(d, { ...cfg, format: "YYYYMMDD" })).toBe("20260301");
	});
	it("defaults to YYYY-MM-DD when format is empty", () => {
		expect(datePrefix(d, { ...cfg, format: "" })).toBe("2026-03-01");
	});
});

describe("fileBaseName", () => {
	it("joins prefix and title", () => expect(fileBaseName(d, "Talk", cfg)).toBe("2026-03-01 Talk"));
	it("trims the title", () => expect(fileBaseName(d, "  Talk  ", cfg)).toBe("2026-03-01 Talk"));
	it("replaces filename-hostile characters with -", () =>
		expect(fileBaseName(d, 'a/b:c*d?e"f<g>h|i\\j', cfg)).toBe("2026-03-01 a-b-c-d-e-f-g-h-i-j"));
	it("falls back to Untitled for blank or missing title", () => {
		expect(fileBaseName(d, "   ", cfg)).toBe("2026-03-01 Untitled");
		expect(fileBaseName(d, undefined, cfg)).toBe("2026-03-01 Untitled");
	});
});

describe("isInEventFolder", () => {
	it("matches the folder exactly", () => expect(isInEventFolder("Events", cfg)).toBe(true));
	it("ignores a trailing slash in the setting", () =>
		expect(isInEventFolder("Events", { ...cfg, folder: "Events/" })).toBe(true));
	it("rejects subfolders and siblings", () => {
		expect(isInEventFolder("Events/Sub", cfg)).toBe(false);
		expect(isInEventFolder("Other", cfg)).toBe(false);
	});
	it("treats empty and / as the vault root, on either side", () => {
		expect(isInEventFolder("", { ...cfg, folder: "" })).toBe(true);
		expect(isInEventFolder("/", { ...cfg, folder: "" })).toBe(true);
		expect(isInEventFolder("", { ...cfg, folder: "/" })).toBe(true);
		expect(isInEventFolder("Events", { ...cfg, folder: "" })).toBe(false);
		expect(isInEventFolder("", cfg)).toBe(false);
	});
});

describe("hasDatePrefix / stripDatePrefix", () => {
	it("detects and strips the prefix", () => {
		expect(hasDatePrefix("2026-03-01 Talk", d, cfg)).toBe(true);
		expect(stripDatePrefix("2026-03-01 Talk", d, cfg)).toBe("Talk");
	});
	it("requires the space after the prefix", () => {
		expect(hasDatePrefix("2026-03-01Talk", d, cfg)).toBe(false);
		expect(stripDatePrefix("2026-03-01Talk", d, cfg)).toBe("2026-03-01Talk");
	});
	it("leaves names with a different date untouched", () =>
		expect(stripDatePrefix("2026-03-02 Talk", d, cfg)).toBe("2026-03-02 Talk"));
	it("strips only the leading prefix when the title starts with a date", () =>
		expect(stripDatePrefix("2026-03-01 2026-03-01 Talk", d, cfg)).toBe("2026-03-01 Talk"));
});

describe("eventNoteConfig", () => {
	it("maps settings fields", () =>
		expect(eventNoteConfig({ newEventFolder: "E", newEventDateFormat: "YY" })).toEqual({ folder: "E", format: "YY" }));
});
