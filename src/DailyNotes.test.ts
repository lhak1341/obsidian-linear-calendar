import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { TFile, TFolder } from "obsidian";
import type { App, Component, TAbstractFile } from "obsidian";
import { DailyNotes } from "./DailyNotes";

type Handler = (file: TAbstractFile, oldPath?: string) => void;

interface DailySettings {
	folder: string;
	format: string;
	template?: string;
}

function makeFile(path: string): TFile {
	const f = new TFile();
	f.path = path;
	f.name = path.split("/").pop()!;
	const dot = f.name.lastIndexOf(".");
	f.extension = dot < 0 ? "" : f.name.slice(dot + 1);
	f.basename = dot < 0 ? f.name : f.name.slice(0, dot);
	return f;
}

function makeFolder(path: string, children: TAbstractFile[] = []): TFolder {
	const f = new TFolder();
	f.path = path;
	f.name = path.split("/").pop() ?? "";
	f.children = children;
	return f;
}

/** A vault tree plus the core daily-notes settings the module reads; `emit` fires a vault event like Obsidian would. */
function makeEnv(root: TFolder, settings: DailySettings) {
	const handlers: Record<string, Handler[]> = { create: [], delete: [], rename: [] };
	const byPath = new Map<string, TAbstractFile>();
	const index = (f: TAbstractFile) => {
		byPath.set(f.path, f);
		if (f instanceof TFolder) f.children.forEach(index);
	};
	index(root);

	const created: { path: string; content: string }[] = [];
	const folders: string[] = [];
	const files = new Map<string, string>();

	const options = { ...settings };
	const app = {
		vault: {
			getRoot: () => root,
			getAbstractFileByPath: (p: string) => byPath.get(p) ?? null,
			on: (name: string, cb: Handler) => { handlers[name].push(cb); return { name, cb }; },
			createFolder: (p: string) => { folders.push(p); byPath.set(p, makeFolder(p)); return Promise.resolve(); },
			read: (f: TFile) => Promise.resolve(files.get(f.path) ?? ""),
			create: (p: string, content: string) => {
				created.push({ path: p, content });
				const f = makeFile(p);
				byPath.set(p, f);
				return Promise.resolve(f);
			},
		},
		plugins: { getPlugin: () => null },
		internalPlugins: { getPluginById: () => ({ instance: { options } }) },
	} as unknown as App;

	const owner = { registerEvent: () => {}, register: () => {} } as unknown as Component;
	return {
		notes: new DailyNotes(app, owner),
		options,
		created,
		folders,
		files,
		byPath,
		emit: (name: string, file: TAbstractFile, oldPath?: string) => handlers[name].forEach((h) => h(file, oldPath)),
		/** Mirrors the vault's own mutation so a later rebuild sees it. */
		add: (parent: TFolder, f: TAbstractFile) => { parent.children.push(f); byPath.set(f.path, f); },
		remove: (parent: TFolder, f: TAbstractFile) => { parent.children = parent.children.filter((c) => c !== f); byPath.delete(f.path); },
	};
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("DailyNotes.get", () => {
	it("finds a note by 0-based month in a nested folder", () => {
		const note = makeFile("Journal/2026/2026-03-05.md");
		const root = makeFolder("/", [makeFolder("Journal", [makeFolder("Journal/2026", [note])])]);
		const { notes } = makeEnv(root, { folder: "Journal", format: "YYYY-MM-DD" });
		expect(notes.get(2026, 2, 5)).toBe(note);
		expect(notes.get(2026, 2, 6)).toBeUndefined();
	});

	it("honours a custom filename format", () => {
		const note = makeFile("Daily/20261020.md");
		const root = makeFolder("/", [makeFolder("Daily", [note])]);
		const { notes } = makeEnv(root, { folder: "Daily", format: "YYYYMMDD" });
		expect(notes.get(2026, 9, 20)).toBe(note);
	});

	it("ignores non-matching basenames and non-markdown files", () => {
		const root = makeFolder("/", [
			makeFile("2026-03-05 meeting.md"),
			makeFile("2026-03-06.png"),
			makeFile("notes.md"),
		]);
		const { notes } = makeEnv(root, { folder: "", format: "YYYY-MM-DD" });
		expect(notes.get(2026, 2, 5)).toBeUndefined();
		expect(notes.get(2026, 2, 6)).toBeUndefined();
	});

	it("reads the vault root when no folder is set", () => {
		const note = makeFile("2026-03-05.md");
		const { notes } = makeEnv(makeFolder("/", [note]), { folder: "", format: "YYYY-MM-DD" });
		expect(notes.get(2026, 2, 5)).toBe(note);
	});

	it("returns nothing when the configured folder does not exist", () => {
		const { notes } = makeEnv(makeFolder("/", [makeFile("2026-03-05.md")]), { folder: "Missing", format: "YYYY-MM-DD" });
		expect(notes.get(2026, 2, 5)).toBeUndefined();
	});

	it("rebuilds after a settings change without any vault event", () => {
		const a = makeFile("A/2026-03-05.md");
		const b = makeFile("B/20260305.md");
		const root = makeFolder("/", [makeFolder("A", [a]), makeFolder("B", [b])]);
		const env = makeEnv(root, { folder: "A", format: "YYYY-MM-DD" });
		expect(env.notes.get(2026, 2, 5)).toBe(a);
		env.options.folder = "B";
		env.options.format = "YYYYMMDD";
		expect(env.notes.get(2026, 2, 5)).toBe(b);
	});

	it("sees a renamed note after the rename event", () => {
		const note = makeFile("2026-03-05.md");
		const root = makeFolder("/", [note]);
		const env = makeEnv(root, { folder: "", format: "YYYY-MM-DD" });
		expect(env.notes.get(2026, 2, 5)).toBe(note);

		env.remove(root, note);
		const renamed = makeFile("2026-03-06.md");
		env.add(root, renamed);
		env.emit("rename", renamed, "2026-03-05.md");
		expect(env.notes.get(2026, 2, 5)).toBeUndefined();
		expect(env.notes.get(2026, 2, 6)).toBe(renamed);
	});
});

describe("DailyNotes.create", () => {
	it("creates the folder and the note, visible to the next get", async () => {
		const env = makeEnv(makeFolder("/"), { folder: "Journal", format: "YYYY-MM-DD" });
		expect(env.notes.get(2026, 2, 5)).toBeUndefined();

		const file = await env.notes.create(2026, 2, 5);
		expect(env.folders).toEqual(["Journal"]);
		expect(env.created).toEqual([{ path: "Journal/2026-03-05.md", content: "" }]);
		expect(env.notes.get(2026, 2, 5)).toBe(file);
	});

	it("fills the template's date and title placeholders", async () => {
		const root = makeFolder("/", [makeFile("Templates/Daily.md")]);
		const env = makeEnv(root, { folder: "", format: "YYYY-MM-DD", template: "Templates/Daily" });
		env.files.set("Templates/Daily.md", "# {{title}} ({{ date }})");
		await env.notes.create(2026, 2, 5);
		expect(env.created[0].content).toBe("# 2026-03-05 (2026-03-05)");
	});
});

describe("DailyNotes.onChange", () => {
	it("fires once, debounced, for a burst of daily-note events", () => {
		const root = makeFolder("/", [makeFolder("Journal")]);
		const env = makeEnv(root, { folder: "Journal", format: "YYYY-MM-DD" });
		const cb = vi.fn();
		env.notes.onChange(cb);

		env.emit("create", makeFile("Journal/2026-03-05.md"));
		env.emit("create", makeFile("Journal/2026-03-06.md"));
		expect(cb).not.toHaveBeenCalled();
		vi.advanceTimersByTime(300);
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("ignores events outside the folder and non-markdown files", () => {
		const env = makeEnv(makeFolder("/"), { folder: "Journal", format: "YYYY-MM-DD" });
		const cb = vi.fn();
		env.notes.onChange(cb);

		env.emit("create", makeFile("Projects/plan.md"));
		env.emit("delete", makeFile("Journal/image.png"));
		vi.advanceTimersByTime(1000);
		expect(cb).not.toHaveBeenCalled();
	});

	it("fires when a note is renamed out of the folder", () => {
		const env = makeEnv(makeFolder("/"), { folder: "Journal", format: "YYYY-MM-DD" });
		const cb = vi.fn();
		env.notes.onChange(cb);
		env.emit("rename", makeFile("Archive/2026-03-05.md"), "Journal/2026-03-05.md");
		vi.advanceTimersByTime(300);
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("fires when a folder holding the daily-note folder is deleted", () => {
		const env = makeEnv(makeFolder("/"), { folder: "Notes/Journal", format: "YYYY-MM-DD" });
		const cb = vi.fn();
		env.notes.onChange(cb);
		env.emit("delete", makeFolder("Notes"));
		vi.advanceTimersByTime(300);
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("treats any markdown file as a daily-note event when the folder is the vault root", () => {
		const env = makeEnv(makeFolder("/"), { folder: "", format: "YYYY-MM-DD" });
		const cb = vi.fn();
		env.notes.onChange(cb);
		env.emit("create", makeFile("anywhere/deep/note.md"));
		vi.advanceTimersByTime(300);
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("stops calling after unsubscribe", () => {
		const env = makeEnv(makeFolder("/"), { folder: "", format: "YYYY-MM-DD" });
		const cb = vi.fn();
		const off = env.notes.onChange(cb);
		off();
		env.emit("create", makeFile("2026-03-05.md"));
		vi.advanceTimersByTime(300);
		expect(cb).not.toHaveBeenCalled();
	});
});
