import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { TFile, TFolder } from "obsidian";
import type { App } from "obsidian";
import type { PluginSettings } from "./types";
import { ObsidianEventNotes } from "./EventNotes";

type Fm = Record<string, unknown>;

const mapping = {
	titleProp: "__filename__",
	startDateProp: "dateStart",
	endDateProp: "dateEnd",
	iconProp: "icon",
	anniversaryProp: "anniversary",
	descriptionProp: "description",
	remindProp: "remindOn",
};

function makeSettings(overrides: Partial<PluginSettings> = {}): PluginSettings {
	return {
		defaultMapping: mapping,
		newEventFolder: "Events",
		newEventDateFormat: "YYYY-MM-DD",
		newEventTemplate: "",
		...overrides,
	} as PluginSettings;
}

interface FakeOptions {
	/** The metadata cache never catches up with writes (exercises the settle timeout). */
	staleCache?: boolean;
	templater?: (file: TFile, disk: Map<string, Fm>) => void;
}

/** A vault where `processFrontMatter` writes "disk" immediately and the metadata cache catches up on a later tick, like Obsidian. */
function makeVault(opts: FakeOptions = {}) {
	const files = new Map<string, TFile>();
	const disk = new Map<string, Fm>();
	const cache = new Map<string, Fm>();
	const log: string[] = [];
	const handlers = new Set<(file: TFile) => void>();

	function addFile(path: string, fm?: Fm): TFile {
		const file = new TFile();
		file.path = path;
		const slash = path.lastIndexOf("/");
		const name = path.slice(slash + 1);
		file.basename = name.replace(/\.md$/, "");
		file.extension = "md";
		const parent = new TFolder();
		parent.path = slash < 0 ? "/" : path.slice(0, slash);
		file.parent = parent;
		files.set(path, file);
		disk.set(path, fm ? { ...fm } : {});
		if (fm) cache.set(path, { ...fm });
		return file;
	}

	const renameFile = vi.fn(async (file: TFile, newPath: string) => {
		files.delete(file.path);
		disk.set(newPath, disk.get(file.path)!);
		disk.delete(file.path);
		if (cache.has(file.path)) cache.set(newPath, cache.get(file.path)!);
		cache.delete(file.path);
		file.path = newPath;
		files.set(newPath, file);
	});
	const trashFile = vi.fn(async (file: TFile) => { files.delete(file.path); });
	const openLinkText = vi.fn(async () => undefined);

	const app = {
		vault: {
			getAbstractFileByPath: (p: string) => files.get(p) ?? null,
			createFolder: async (p: string) => { files.set(p, new TFolder() as unknown as TFile); },
			create: async (path: string) => addFile(path),
		},
		fileManager: {
			processFrontMatter: async (file: TFile, fn: (fm: Fm) => void) => {
				fn(disk.get(file.path)!);
				log.push(`write ${file.path}`);
				if (opts.staleCache) return;
				setTimeout(() => {
					cache.set(file.path, structuredClone(disk.get(file.path)!));
					log.push(`cache ${file.path}`);
					for (const h of [...handlers]) h(file);
				}, 0);
			},
			renameFile,
			trashFile,
		},
		metadataCache: {
			getFileCache: (file: TFile) => ({ frontmatter: cache.get(file.path) }),
			on: (_evt: string, cb: (file: TFile) => void) => { handlers.add(cb); return cb; },
			offref: (cb: (file: TFile) => void) => { handlers.delete(cb); },
		},
		workspace: { openLinkText },
		plugins: opts.templater
			? {
				getPlugin: () => ({
					templater: {
						write_template_to_file: async (_t: TFile, target: TFile) => { opts.templater!(target, disk); },
					},
				}),
			}
			: undefined,
	} as unknown as App;

	return { app, addFile, disk, cache, log, renameFile, trashFile, openLinkText, handlers };
}

beforeEach(() => {
	vi.stubGlobal("window", globalThis);
	vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("move", () => {
	it("carries the reminder forward by the same interval the event moved", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", { dateStart: "2026-03-01", remindOn: "2026-02-25" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.move("Events/2026-03-01 Talk.md", d(2026, 3, 1), d(2026, 3, 11), d(2026, 3, 11));

		const fm = v.disk.get("Events/2026-03-11 Talk.md")!;
		expect(fm.dateStart).toBe("2026-03-11");
		// reminder sat 4 days before the start; it must still sit 4 days before
		expect(fm.remindOn).toBe("2026-03-07");
	});

	it("leaves dateEnd unwritten for a single-day event that had none", async () => {
		const v = makeVault();
		v.addFile("Archive/note.md", { dateStart: "2026-03-01" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.move("Archive/note.md", d(2026, 3, 1), d(2026, 3, 2), d(2026, 3, 2));

		const fm = v.disk.get("Archive/note.md")!;
		expect(fm.dateStart).toBe("2026-03-02");
		expect("dateEnd" in fm).toBe(false);
	});

	it("renames a new-event note whose filename starts with the old date", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", { dateStart: "2026-03-01" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.move("Events/2026-03-01 Talk.md", d(2026, 3, 1), d(2026, 3, 4), d(2026, 3, 4));

		expect(v.renameFile).toHaveBeenCalledOnce();
		expect(v.renameFile.mock.calls[0][1]).toBe("Events/2026-03-04 Talk.md");
	});

	it("suffixes a counter when the target filename is already taken", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", { dateStart: "2026-03-01" });
		v.addFile("Events/2026-03-04 Talk.md", { dateStart: "2026-03-04" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.move("Events/2026-03-01 Talk.md", d(2026, 3, 1), d(2026, 3, 4), d(2026, 3, 4));

		expect(v.renameFile.mock.calls[0][1]).toBe("Events/2026-03-04 Talk 1.md");
	});

	it("does not rename a note living outside the new-event folder", async () => {
		const v = makeVault();
		v.addFile("Archive/2026-03-01 Talk.md", { dateStart: "2026-03-01" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.move("Archive/2026-03-01 Talk.md", d(2026, 3, 1), d(2026, 3, 4), d(2026, 3, 4));

		expect(v.renameFile).not.toHaveBeenCalled();
	});

	it("does not rename a note in the event folder that was not named by the date prefix", async () => {
		const v = makeVault();
		v.addFile("Events/Talk.md", { dateStart: "2026-03-01" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.move("Events/Talk.md", d(2026, 3, 1), d(2026, 3, 4), d(2026, 3, 4));

		expect(v.renameFile).not.toHaveBeenCalled();
	});

	it("resolves only after the metadata cache has caught up with the write", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", { dateStart: "2026-03-01" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.move("Events/2026-03-01 Talk.md", d(2026, 3, 1), d(2026, 3, 4), d(2026, 3, 4));
		v.log.push("resolved");

		expect(v.log).toEqual([
			"write Events/2026-03-01 Talk.md",
			"cache Events/2026-03-01 Talk.md",
			"resolved",
		]);
		expect(v.handlers.size).toBe(0);
	});

	it("stops waiting for a cache that never catches up", async () => {
		vi.useFakeTimers();
		const v = makeVault({ staleCache: true });
		v.addFile("Archive/note.md", { dateStart: "2026-03-01" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		let settled = false;
		const p = notes.move("Archive/note.md", d(2026, 3, 1), d(2026, 3, 2), d(2026, 3, 2)).then((ok) => { settled = ok; });
		await vi.advanceTimersByTimeAsync(1999);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await p;
		expect(settled).toBe(true);
		expect(v.handlers.size).toBe(0);
	});

	it("resolves false for a path that is not a file", async () => {
		const v = makeVault();
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		expect(await notes.move("Nope.md", d(2026, 3, 1), d(2026, 3, 2), d(2026, 3, 2))).toBe(false);
	});
});

describe("create", () => {
	it("writes the mapped fields, tag first, into a note named by the date prefix", async () => {
		const v = makeVault();
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		const ok = await notes.create(d(2026, 3, 1), {
			title: "Talk: Q&A",
			tag: "linear-calendar/work",
			icon: " mic ",
			description: "  hello ",
			anniversary: true,
			dateEnd: d(2026, 3, 3),
			remindOn: d(2026, 3, 8),
			openAfterCreate: false,
		});

		expect(ok).toBe(true);
		expect(v.disk.get("Events/2026-03-01 Talk- Q&A.md")).toEqual({
			dateStart: "2026-03-01",
			dateEnd: "2026-03-03",
			icon: "mic",
			description: "hello",
			remindOn: "2026-03-08",
			anniversary: true,
			tags: ["linear-calendar/work"],
		});
		expect(v.openLinkText).not.toHaveBeenCalled();
	});

	it("opens the note only when asked", async () => {
		const v = makeVault();
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.create(d(2026, 3, 1), { title: "Talk", openAfterCreate: true });

		expect(v.openLinkText).toHaveBeenCalledWith("Events/2026-03-01 Talk.md", "", false);
	});

	it("suffixes a counter when the filename is taken", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", { dateStart: "2026-03-01" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.create(d(2026, 3, 1), { title: "Talk", openAfterCreate: false });

		expect(v.disk.has("Events/2026-03-01 Talk 1.md")).toBe(true);
	});

	it("leaves a template's own fields alone when the option is omitted", async () => {
		const v = makeVault({ templater: (file, disk) => { disk.set(file.path, { icon: "star", tags: ["keep-me"] }); } });
		v.addFile("Templates/Event.md");
		const notes = new ObsidianEventNotes(v.app, () => makeSettings({ newEventTemplate: "Templates/Event" }));

		await notes.create(d(2026, 3, 1), { title: "Talk", tag: "linear-calendar/work", openAfterCreate: false });

		const fm = v.disk.get("Events/2026-03-01 Talk.md")!;
		expect(fm.icon).toBe("star");
		expect(fm.tags).toEqual(["linear-calendar/work", "keep-me"]);
	});

	it("trashes the half-made note and resolves false when the template fails", async () => {
		const v = makeVault({ templater: () => { throw new Error("boom"); } });
		v.addFile("Templates/Event.md");
		const notes = new ObsidianEventNotes(v.app, () => makeSettings({ newEventTemplate: "Templates/Event" }));

		const ok = await notes.create(d(2026, 3, 1), { title: "Talk", openAfterCreate: false });

		expect(ok).toBe(false);
		expect(v.trashFile).toHaveBeenCalledOnce();
	});

	it("resolves only after the metadata cache sees the new note's start date", async () => {
		const v = makeVault();
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.create(d(2026, 3, 1), { title: "Talk", openAfterCreate: false });
		v.log.push("resolved");

		expect(v.log.slice(-2)).toEqual(["cache Events/2026-03-01 Talk.md", "resolved"]);
	});
});

describe("update", () => {
	it("clears fields the caller omitted and keeps extra calendar subtags", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", {
			dateStart: "2026-03-01",
			dateEnd: "2026-03-03",
			icon: "mic",
			description: "old",
			remindOn: "2026-03-08",
			anniversary: true,
			tags: ["linear-calendar/work", "linear-calendar/extra", "other"],
		});
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.update("Events/2026-03-01 Talk.md", d(2026, 3, 2), { tag: "linear-calendar/home" });

		expect(v.disk.get("Events/2026-03-01 Talk.md")).toEqual({
			dateStart: "2026-03-02",
			anniversary: false,
			tags: ["linear-calendar/home", "other", "linear-calendar/extra"],
		});
		expect(v.renameFile).not.toHaveBeenCalled();
	});
});

describe("settle", () => {
	it("waits for the cache after an edit that leaves the start date unchanged", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", { dateStart: "2026-03-01", tags: ["linear-calendar"] });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.update("Events/2026-03-01 Talk.md", d(2026, 3, 1), { description: "new", tag: "linear-calendar" });
		v.log.push("resolved");

		expect(v.log.slice(-2)).toEqual(["cache Events/2026-03-01 Talk.md", "resolved"]);
		expect(v.cache.get("Events/2026-03-01 Talk.md")!.description).toBe("new");
	});

	it("waits for a cleared field to leave the cache", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", { dateStart: "2026-03-01", remindOn: "2026-03-05", tags: ["linear-calendar"] });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		await notes.update("Events/2026-03-01 Talk.md", d(2026, 3, 1), {});

		expect("remindOn" in v.cache.get("Events/2026-03-01 Talk.md")!).toBe(false);
	});
});

describe("promoteReminder", () => {
	it("creates a note on the reminder date, carries the reminder on, and clears the source's", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", {
			dateStart: "2026-03-01",
			remindOn: "2026-03-05",
			tags: ["linear-calendar/work"],
		});
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		const ok = await notes.promoteReminder("Events/2026-03-01 Talk.md");

		expect(ok).toBe(true);
		const promoted = v.disk.get("Events/2026-03-05 Talk.md")!;
		expect(promoted.dateStart).toBe("2026-03-05");
		expect(promoted.remindOn).toBe("2026-03-09"); // same 4-day interval, re-anchored
		expect(promoted.tags).toEqual(["linear-calendar/work"]);
		expect("remindOn" in v.disk.get("Events/2026-03-01 Talk.md")!).toBe(false);
		expect(v.openLinkText).not.toHaveBeenCalled();
	});

	it("titles the new note from the frontmatter title, not the filename, when the mapping has one", async () => {
		const v = makeVault();
		const mapped = () => makeSettings({ defaultMapping: { ...mapping, titleProp: "title" } });
		v.addFile("Events/2026-03-01 Whatever.md", { dateStart: "2026-03-01", remindOn: "2026-03-05", title: "Real Talk" });
		const notes = new ObsidianEventNotes(v.app, mapped);

		expect(await notes.promoteReminder("Events/2026-03-01 Whatever.md")).toBe(true);
		expect(v.disk.get("Events/2026-03-05 Real Talk.md")!.title).toBe("Real Talk");
	});

	it("keeps a note with only the bare gate tag uncategorized", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", { dateStart: "2026-03-01", remindOn: "2026-03-05", tags: ["linear-calendar"] });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		expect(await notes.promoteReminder("Events/2026-03-01 Talk.md")).toBe(true);
		expect(v.disk.get("Events/2026-03-05 Talk.md")!.tags).toEqual(["linear-calendar"]);
	});

	it("resolves false and writes nothing when the source has no remind date", async () => {
		const v = makeVault();
		v.addFile("Events/2026-03-01 Talk.md", { dateStart: "2026-03-01" });
		const notes = new ObsidianEventNotes(v.app, makeSettings);

		expect(await notes.promoteReminder("Events/2026-03-01 Talk.md")).toBe(false);
		expect(v.log).toEqual([]);
	});
});
