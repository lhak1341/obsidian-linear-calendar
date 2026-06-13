import { Plugin, WorkspaceLeaf } from "obsidian";
import type { CalendarItem, PluginSettings } from "./types";
import { DEFAULT_SETTINGS, VIEW_TYPE_LINEAR_CALENDAR } from "./constants";
import { LinearCalendarView } from "./view/LinearCalendarView";
import { LinearCalendarSettingTab } from "./settings";
import { FrontmatterScanner } from "./data/FrontmatterScanner";
import { CalendarRenderer } from "./view/CalendarRenderer";
import { buildTagColorMap } from "./utils/colorUtils";
import { getDailyNoteMap } from "./utils/dailyNotes";

export default class LinearCalendarPlugin extends Plugin {
	settings: PluginSettings = DEFAULT_SETTINGS;
	private scanner!: FrontmatterScanner;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.scanner = new FrontmatterScanner(this.app);

		this.registerView(VIEW_TYPE_LINEAR_CALENDAR, (leaf: WorkspaceLeaf) => {
			return new LinearCalendarView(
				leaf,
				this.settings,
				() => this.settings.defaultMapping,
			);
		});

		this.addCommand({
			id: "open-linear-calendar",
			name: "Open",
			callback: () => this.activateView(),
		});

		this.addSettingTab(new LinearCalendarSettingTab(this.app, this));
	}

	async onunload(): Promise<void> {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_LINEAR_CALENDAR);
	}

	async loadSettings(): Promise<void> {
		const saved = (await this.loadData()) ?? {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
		this.settings.defaultMapping = Object.assign(
			{},
			DEFAULT_SETTINGS.defaultMapping,
			saved.defaultMapping ?? {},
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		for (const leaf of this.app.workspace.getLeavesOfType(
			VIEW_TYPE_LINEAR_CALENDAR,
		)) {
			const view = leaf.view as LinearCalendarView;
			view.refresh();
		}
	}

	/** Public API for other plugins — returns current-year items + resolved color map. */
	getCalendarData(year: number): { items: CalendarItem[]; colorMap: Map<string, string> } {
		const items = this.scanner.scan(this.settings.defaultMapping, year);
		const colorMap = buildTagColorMap(items, this.settings);
		return { items, colorMap };
	}

	/**
	 * Public API — mount a full single-month calendar strip (current month) into
	 * `container`. Uses LC's own renderers so styles, bars, tooltips, and the
	 * now-indicator all work exactly as in the full view.
	 * Returns a cleanup function; call it when the host view closes.
	 */
	mountMonthStrip(container: HTMLElement, categoriesEl: HTMLElement): () => void {
		const year = new Date().getFullYear();
		const month = new Date().getMonth();
		const hiddenCategories = new Set<string>();

		let render!: () => void;

		const renderer = new CalendarRenderer(
			this.app,
			container,
			categoriesEl,
			this.scanner,
			this.settings,
			() => this.settings.defaultMapping,
			{
				onCategoryToggle: (tag) => {
					if (hiddenCategories.has(tag)) hiddenCategories.delete(tag);
					else hiddenCategories.add(tag);
					render();
				},
				onDropCommit: async (filePath, newStart, newEnd) => {
					const mapping = this.settings.defaultMapping;
					const file = this.app.vault.getAbstractFileByPath(filePath);
					if (!file) return;
					const pad = (n: number) => String(n).padStart(2, "0");
					const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
					try {
						await this.app.fileManager.processFrontMatter(file as import("obsidian").TFile, (fm) => {
							fm[mapping.startDateProp] = fmt(newStart);
							if (fmt(newStart) !== fmt(newEnd) || fm[mapping.endDateProp]) {
								fm[mapping.endDateProp] = fmt(newEnd);
							}
						});
					} catch (err) {
						console.error("[linear-calendar] drag write failed:", err);
					}
				},
			},
		);

		render = () => {
			const dailyNoteMap = getDailyNoteMap(this.app);
			renderer.render(
				year,
				[month],
				hiddenCategories,
				"horizontal",
				"date",
				0,
				new Set(dailyNoteMap.keys()),
				dailyNoteMap,
			);
		};

		render();

		let lastWidth = container.offsetWidth;
		const ro = new ResizeObserver(() => {
			const w = container.offsetWidth;
			if (w !== lastWidth && w > 0) {
				lastWidth = w;
				render();
			}
		});
		ro.observe(container);

		return () => {
			renderer.cleanup();
			ro.disconnect();
		};
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_LINEAR_CALENDAR)[0];
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({
				type: VIEW_TYPE_LINEAR_CALENDAR,
				active: true,
			});
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
