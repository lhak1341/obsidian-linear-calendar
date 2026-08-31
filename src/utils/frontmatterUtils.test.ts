import { describe, it, expect, vi } from "vitest";
import { TFile, TFolder } from "obsidian";
import type { App } from "obsidian";
import type { ColumnMapping } from "../types";
import { commitDrag } from "./frontmatterUtils";

const mapping: ColumnMapping = {
	startDateProp: "dateStart",
	endDateProp: "dateEnd",
	remindProp: "remindOn",
} as ColumnMapping;

function makeFile(path: string, parentPath: string): TFile {
	const file = new TFile();
	file.path = path;
	const base = path.slice(path.lastIndexOf("/") + 1);
	file.basename = base.replace(/\.md$/, "");
	file.extension = "md";
	const parent = new TFolder();
	parent.path = parentPath;
	file.parent = parent;
	return file;
}

function makeApp(files: TFile[], frontmatter: Record<string, unknown>) {
	const byPath = new Map(files.map((f) => [f.path, f]));
	const renameFile = vi.fn(async (_file: TFile, _newPath: string) => undefined);
	const app = {
		vault: { getAbstractFileByPath: (p: string) => byPath.get(p) ?? null },
		fileManager: {
			processFrontMatter: async (_file: TFile, fn: (fm: Record<string, unknown>) => void) => {
				fn(frontmatter);
			},
			renameFile,
		},
	} as unknown as App;
	return { app, renameFile, frontmatter };
}

describe("commitDrag", () => {
	it("carries the reminder forward by the same interval the event moved", async () => {
		const { app, frontmatter } = makeApp([makeFile("Events/2026-03-01 Talk.md", "Events")], {
			dateStart: "2026-03-01",
			remindOn: "2026-02-25",
		});

		await commitDrag(
			app,
			mapping,
			"Events",
			"YYYY-MM-DD",
			"Events/2026-03-01 Talk.md",
			new Date(2026, 2, 1),
			new Date(2026, 2, 11),
			new Date(2026, 2, 11),
		);

		expect(frontmatter.dateStart).toBe("2026-03-11");
		// reminder sat 4 days before the start; it must still sit 4 days before
		expect(frontmatter.remindOn).toBe("2026-03-07");
	});

	it("leaves dateEnd unwritten for a single-day event that had none", async () => {
		const { app, frontmatter } = makeApp([makeFile("Events/2026-03-01 Talk.md", "Events")], {
			dateStart: "2026-03-01",
		});

		await commitDrag(
			app,
			mapping,
			"Events",
			"YYYY-MM-DD",
			"Events/2026-03-01 Talk.md",
			new Date(2026, 2, 1),
			new Date(2026, 2, 2),
			new Date(2026, 2, 2),
		);

		expect(frontmatter.dateStart).toBe("2026-03-02");
		expect("dateEnd" in frontmatter).toBe(false);
	});

	it("renames a new-event note whose filename starts with the old date", async () => {
		const { app, renameFile } = makeApp([makeFile("Events/2026-03-01 Talk.md", "Events")], {
			dateStart: "2026-03-01",
		});

		await commitDrag(
			app,
			mapping,
			"Events",
			"YYYY-MM-DD",
			"Events/2026-03-01 Talk.md",
			new Date(2026, 2, 1),
			new Date(2026, 2, 4),
			new Date(2026, 2, 4),
		);

		expect(renameFile).toHaveBeenCalledOnce();
		expect(renameFile.mock.calls[0][1]).toBe("Events/2026-03-04 Talk.md");
	});

	it("suffixes a counter when the target filename is already taken", async () => {
		const { app, renameFile } = makeApp(
			[makeFile("Events/2026-03-01 Talk.md", "Events"), makeFile("Events/2026-03-04 Talk.md", "Events")],
			{ dateStart: "2026-03-01" },
		);

		await commitDrag(
			app,
			mapping,
			"Events",
			"YYYY-MM-DD",
			"Events/2026-03-01 Talk.md",
			new Date(2026, 2, 1),
			new Date(2026, 2, 4),
			new Date(2026, 2, 4),
		);

		expect(renameFile.mock.calls[0][1]).toBe("Events/2026-03-04 Talk 1.md");
	});

	it("does not rename a note living outside the new-event folder", async () => {
		const { app, renameFile } = makeApp([makeFile("Archive/2026-03-01 Talk.md", "Archive")], {
			dateStart: "2026-03-01",
		});

		await commitDrag(
			app,
			mapping,
			"Events",
			"YYYY-MM-DD",
			"Archive/2026-03-01 Talk.md",
			new Date(2026, 2, 1),
			new Date(2026, 2, 4),
			new Date(2026, 2, 4),
		);

		expect(renameFile).not.toHaveBeenCalled();
	});
});
