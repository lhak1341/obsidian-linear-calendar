import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { TFile } from "obsidian";
import type { App, Component } from "obsidian";
import type { ColumnMapping } from "../types";
import { FrontmatterScanner } from "./FrontmatterScanner";

type Fm = Record<string, unknown>;

const mapping: ColumnMapping = {
	titleProp: "__filename__",
	startDateProp: "datestart",
	endDateProp: "dateend",
	iconProp: "icon",
	anniversaryProp: "anniversary",
	descriptionProp: "description",
	remindProp: "",
};

interface FakeNote {
	frontmatter?: Fm;
	inlineTags?: string[];
	mtime?: number;
}

function setup() {
	const notes = new Map<string, FakeNote>();
	const files = new Map<string, TFile>();
	const handlers: Record<string, ((...args: any[]) => void)[]> = {};
	const cleanups: (() => void)[] = [];

	const fileFor = (path: string): TFile => {
		let f = files.get(path);
		if (!f) {
			f = new TFile();
			f.path = path;
			f.basename = path.replace(/\.md$/, "");
			files.set(path, f);
		}
		return f;
	};
	Object.defineProperty(TFile.prototype, "stat", {
		configurable: true,
		get() { return { mtime: notes.get((this as TFile).path)?.mtime ?? 1 }; },
	});

	const on = (evt: string, cb: (...args: any[]) => void) => {
		(handlers[evt] ??= []).push(cb);
		return cb;
	};
	const app = {
		vault: { getMarkdownFiles: () => [...notes.keys()].map(fileFor), on },
		metadataCache: {
			getFileCache: (f: TFile) => {
				const n = notes.get(f.path);
				return n && { frontmatter: n.frontmatter, tags: (n.inlineTags ?? []).map((tag) => ({ tag })) };
			},
			on,
		},
	} as unknown as App;
	const owner = { registerEvent: vi.fn(), register: (fn: () => void) => { cleanups.push(fn); } } as unknown as Component;

	let currentMapping = mapping;
	const scanner = new FrontmatterScanner(app, owner, () => currentMapping);
	return {
		scanner,
		setMapping: (m: ColumnMapping) => { currentMapping = m; },
		notes,
		fileFor,
		unload: () => cleanups.forEach((fn) => fn()),
		emit: (evt: string, ...args: unknown[]) => handlers[evt]?.forEach((cb) => cb(...args)),
	};
}

/** Every item touching 2026, the year view's request. */
const in2026 = (scanner: FrontmatterScanner) => scanner.items(new Date(2026, 0, 1), new Date(2026, 11, 31));

const calendarNote = (extra: Fm = {}): FakeNote => ({ frontmatter: { tags: ["linear-calendar"], datestart: "2026-03-01", ...extra } });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("items", () => {
	it("returns calendar notes and ignores the rest", () => {
		const { scanner, notes } = setup();
		notes.set("a.md", calendarNote());
		notes.set("b.md", { frontmatter: { datestart: "2026-03-01" } });

		expect(in2026(scanner).map((i) => i.filePath)).toEqual(["a.md"]);
	});

	it("picks up a changed mapping without any invalidation call", () => {
		const { scanner, notes, setMapping } = setup();
		notes.set("a.md", calendarNote({ when: "2026-05-05" }));
		expect(in2026(scanner)[0].dateStart.getMonth()).toBe(2);

		setMapping({ ...mapping, startDateProp: "when" });

		expect(in2026(scanner)[0].dateStart.getMonth()).toBe(4);
	});

	it("orders same-day items by path, whatever order the cache met them in", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("b.md", calendarNote());
		notes.set("a.md", calendarNote());
		expect(in2026(scanner).map((i) => i.filePath)).toEqual(["a.md", "b.md"]);

		// A change drops b's entry and the next scan re-adds it last; the order must not follow.
		emit("changed", fileFor("b.md"));
		notes.set("c.md", calendarNote({ datestart: "2026-02-01" }));
		expect(in2026(scanner).map((i) => i.filePath)).toEqual(["c.md", "a.md", "b.md"]);
	});

	it("orders by the item's own start, so a span begun last year comes before one starting Jan 1", () => {
		const { scanner, notes } = setup();
		notes.set("a.md", calendarNote({ datestart: "2026-01-01" }));
		notes.set("z.md", calendarNote({ datestart: "2025-12-30", dateend: "2026-01-03" }));
		expect(in2026(scanner).map((i) => i.filePath)).toEqual(["z.md", "a.md"]);
	});

	it("answers a span across New Year in one call, each item with its own span", () => {
		const { scanner, notes } = setup();
		notes.set("trip.md", calendarNote({ datestart: "2026-12-30", dateend: "2027-01-02" }));
		notes.set("jan.md", calendarNote({ datestart: "2027-01-10" }));
		notes.set("out.md", calendarNote({ datestart: "2027-01-19" }));
		const items = scanner.items(new Date(2026, 11, 20), new Date(2027, 0, 18));
		expect(items.map((i) => [i.filePath, i.dateStart, i.dateEnd])).toEqual([
			["trip.md", new Date(2026, 11, 30), new Date(2027, 0, 2)],
			["jan.md", new Date(2027, 0, 10), new Date(2027, 0, 10)],
		]);
	});

	it("answers a different span afresh, not from the last span's sorted result", () => {
		const { scanner, notes } = setup();
		notes.set("a.md", calendarNote({ datestart: "2027-03-01" }));
		expect(in2026(scanner)).toEqual([]);
		expect(scanner.items(new Date(2027, 0, 1), new Date(2027, 11, 31)).map((i) => i.filePath)).toEqual(["a.md"]);
	});
});

describe("items after a metadata change", () => {
	it("re-reads a note whose frontmatter was parsed after an earlier scan cached it empty, mtime unchanged", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("a.md", { frontmatter: {}, mtime: 5 });
		expect(in2026(scanner)).toEqual([]); // cached empty under mtime 5

		notes.set("a.md", { frontmatter: { tags: ["linear-calendar"], datestart: "2026-03-01" }, mtime: 5 });
		emit("changed", fileFor("a.md"));

		expect(in2026(scanner).map((i) => i.filePath)).toEqual(["a.md"]);
	});
});

describe("onChange", () => {
	it("fires once, after the quiet period, for a burst of edits to a known calendar note", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("a.md", calendarNote());
		in2026(scanner);
		const cb = vi.fn();
		scanner.onChange(cb);

		emit("changed", fileFor("a.md"));
		emit("changed", fileFor("a.md"));
		emit("changed", fileFor("a.md"));
		vi.advanceTimersByTime(299);
		expect(cb).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);

		expect(cb).toHaveBeenCalledOnce();
	});

	it("waits out a quiet period that restarts on every edit", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("a.md", calendarNote());
		in2026(scanner);
		const cb = vi.fn();
		scanner.onChange(cb);

		emit("changed", fileFor("a.md"));
		vi.advanceTimersByTime(200);
		emit("changed", fileFor("a.md"));
		vi.advanceTimersByTime(200);
		expect(cb).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);

		expect(cb).toHaveBeenCalledOnce();
	});

	it("fires when a known calendar note loses its gate tag", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("a.md", calendarNote());
		in2026(scanner);
		const cb = vi.fn();
		scanner.onChange(cb);

		notes.set("a.md", { frontmatter: { datestart: "2026-03-01" }, mtime: 2 });
		emit("changed", fileFor("a.md"));
		vi.advanceTimersByTime(300);

		expect(cb).toHaveBeenCalledOnce();
		expect(in2026(scanner)).toEqual([]);
	});

	it("stays quiet for an edit to a note that is not a calendar note", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("a.md", calendarNote());
		notes.set("other.md", { frontmatter: { title: "x" } });
		in2026(scanner);
		const cb = vi.fn();
		scanner.onChange(cb);

		emit("changed", fileFor("other.md"));
		vi.advanceTimersByTime(1000);

		expect(cb).not.toHaveBeenCalled();
	});

	it("fires when a note not yet scanned gains the gate tag, in frontmatter or inline", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("fm.md", { frontmatter: { tags: ["linear-calendar/work"] } });
		notes.set("inline.md", { inlineTags: ["#linear-calendar"] });
		const cb = vi.fn();
		scanner.onChange(cb);

		emit("changed", fileFor("fm.md"));
		vi.advanceTimersByTime(300);
		expect(cb).toHaveBeenCalledTimes(1);
		emit("changed", fileFor("inline.md"));
		vi.advanceTimersByTime(300);
		expect(cb).toHaveBeenCalledTimes(2);
	});

	it("evicts and fires when a known calendar note is deleted", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("a.md", calendarNote());
		in2026(scanner);
		const cb = vi.fn();
		scanner.onChange(cb);

		notes.delete("a.md");
		emit("delete", fileFor("a.md"));
		vi.advanceTimersByTime(300);

		expect(cb).toHaveBeenCalledOnce();
		expect(in2026(scanner)).toEqual([]);
	});

	it("evicts and fires when a known calendar note is renamed away", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("a.md", calendarNote());
		in2026(scanner);
		const cb = vi.fn();
		scanner.onChange(cb);

		notes.set("b.md", notes.get("a.md")!);
		notes.delete("a.md");
		emit("rename", fileFor("b.md"), "a.md");
		vi.advanceTimersByTime(300);

		expect(cb).toHaveBeenCalledOnce();
		expect(in2026(scanner).map((i) => i.filePath)).toEqual(["b.md"]);
	});

	it("stays quiet when a file that was never a calendar note is deleted or renamed", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("other.md", { frontmatter: {} });
		in2026(scanner);
		const cb = vi.fn();
		scanner.onChange(cb);

		emit("delete", fileFor("other.md"));
		emit("rename", fileFor("moved.md"), "other.md");
		vi.advanceTimersByTime(1000);

		expect(cb).not.toHaveBeenCalled();
	});

	it("stops calling a subscriber after it unsubscribes", () => {
		const { scanner, notes, fileFor, emit } = setup();
		notes.set("a.md", calendarNote());
		in2026(scanner);
		const cb = vi.fn();
		const unsubscribe = scanner.onChange(cb);

		unsubscribe();
		emit("changed", fileFor("a.md"));
		vi.advanceTimersByTime(300);

		expect(cb).not.toHaveBeenCalled();
	});

	it("drops a pending notification when the owner unloads", () => {
		const { scanner, notes, fileFor, emit, unload } = setup();
		notes.set("a.md", calendarNote());
		in2026(scanner);
		const cb = vi.fn();
		scanner.onChange(cb);

		emit("changed", fileFor("a.md"));
		unload();
		vi.advanceTimersByTime(1000);

		expect(cb).not.toHaveBeenCalled();
	});
});
