import { Plugin, WorkspaceLeaf } from "obsidian";
import type { CalendarItem, PluginSettings } from "./types";
import { DEFAULT_SETTINGS, VIEW_TYPE_LINEAR_CALENDAR } from "./constants";
import { LinearCalendarView } from "./view/LinearCalendarView";
import { LinearCalendarSettingTab } from "./settings";
import { FrontmatterScanner } from "./data/FrontmatterScanner";
import { ObsidianNoteCreator } from "./NoteCreator";
import { CalendarRenderer, RenderConfig } from "./view/CalendarRenderer";
import { writeDragDates } from "./utils/frontmatterUtils";
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
				this.scanner,
				new ObsidianNoteCreator(this.app, this.settings, () => this.settings.defaultMapping),
			);
		});

		this.addCommand({
			id: "open-linear-calendar",
			name: "Open",
			callback: () => this.activateView(),
		});

		this.addSettingTab(new LinearCalendarSettingTab(this.app, this));

		// Keep scanner cache consistent with vault mutations.
		this.registerEvent(
			this.app.vault.on("delete", (file) => this.scanner.evictFile(file.path)),
		);
		this.registerEvent(
			this.app.vault.on("rename", (_file, oldPath) => this.scanner.evictFile(oldPath)),
		);
	}

	onunload(): void {

	}

	async loadSettings(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const saved: Partial<PluginSettings> = (await this.loadData()) ?? {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
		this.settings.defaultMapping = Object.assign(
			{},
			DEFAULT_SETTINGS.defaultMapping,
			saved.defaultMapping ?? {},
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.scanner.invalidateMapping();
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
		const colorMap = buildTagColorMap(items, this.settings.colorMap);
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
			() => this.settings.defaultMapping,
			{
				onCategoryToggle: (tag) => {
					if (hiddenCategories.has(tag)) hiddenCategories.delete(tag);
					else hiddenCategories.add(tag);
					render();
				},
				onDropCommit: async (filePath, newStart, newEnd) => {
					try {
						await writeDragDates(this.app, filePath, this.settings.defaultMapping, newStart, newEnd);
					} catch (err) {
						console.error("[linear-calendar] drag write failed:", err);
					}
				},
			},
		);

		render = () => {
			const config: RenderConfig = {
				year,
				months: [month],
				hiddenCategories,
				layout: "horizontal",
				alignMode: "date",
				rowHeight: 0,
				dailyNoteMap: getDailyNoteMap(this.app),
				colorMap: this.settings.colorMap,
				iconMap: this.settings.iconMap,
				dailyNoteColor: this.settings.dailyNoteColor,
				dailyNoteStyle: this.settings.dailyNoteStyle,
			};
			renderer.render(config);
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
			await workspace.revealLeaf(leaf);
		}
	}
}
