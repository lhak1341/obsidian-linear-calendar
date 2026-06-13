import { Plugin, WorkspaceLeaf } from "obsidian";
import type { CalendarItem, PluginSettings } from "./types";
import { DEFAULT_SETTINGS, VIEW_TYPE_LINEAR_CALENDAR } from "./constants";
import { LinearCalendarView } from "./view/LinearCalendarView";
import { LinearCalendarSettingTab } from "./settings";
import { FrontmatterScanner } from "./data/FrontmatterScanner";
import { GridRenderer } from "./view/GridRenderer";
import { BarRenderer } from "./view/BarRenderer";
import { NowIndicator } from "./view/NowIndicator";
import { Tooltip } from "./view/Tooltip";
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
		// Notify all open calendar views to re-render
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

		const gridRenderer = new GridRenderer(container);
		const barRenderer = new BarRenderer(
			this.app,
			() => this.settings.defaultMapping,
			() => year,
		);
		const nowIndicator = new NowIndicator();
		// Anchor tooltip to parent so overflow-x:auto on container doesn't clip it
		const tooltipAnchor = container.parentElement ?? container;
		const tooltip = new Tooltip(tooltipAnchor);
		const hiddenCategories = new Set<string>();

		const render = () => {
			const allItems = this.scanner.scan(this.settings.defaultMapping, year);
			const tagColorMap = buildTagColorMap(allItems, this.settings);

			// Only items overlapping the current month for chip counts
			const monthStart = new Date(year, month, 1);
			const monthEnd = new Date(year, month + 1, 0);
			const monthItems = allItems.filter(
				(i) => i.dateStart <= monthEnd && i.dateEnd >= monthStart,
			);

			// Category chips
			categoriesEl.empty();
			const categories = new Map<string, number>();
			for (const item of monthItems) {
				const tag = item.tags?.[0] ?? "__uncategorized__";
				categories.set(tag, (categories.get(tag) ?? 0) + 1);
			}
			if (categories.size > 1) {
				for (const [tag, count] of categories) {
					const isHidden = hiddenCategories.has(tag);
					const displayName =
						tag === "__uncategorized__"
							? "Other"
							: tag.replace(/^linear-calendar\//, "");
					const color = tagColorMap.get(tag) ?? "#888";
					const chip = categoriesEl.createDiv({
						cls: `lc-category-chip${isHidden ? " lc-category-hidden" : ""}`,
					});
					chip.createSpan({ cls: "lc-category-dot" }).style.backgroundColor = color;
					chip.createSpan({ cls: "lc-category-name", text: displayName });
					chip.createSpan({ cls: "lc-category-count", text: String(count) });
					chip.addEventListener("click", () => {
						if (hiddenCategories.has(tag)) hiddenCategories.delete(tag);
						else hiddenCategories.add(tag);
						render();
					});
				}
			}

			// Filter hidden categories
			const items = allItems.filter((item) => {
				const tag = item.tags?.[0];
				return tag
					? !hiddenCategories.has(tag)
					: !hiddenCategories.has("__uncategorized__");
			});

			const dailyNoteMap = getDailyNoteMap(this.app);
			const dailyNoteDates = new Set(dailyNoteMap.keys());

			gridRenderer.setDayClickHandler((y, m, d) => {
				const pad = (n: number) => String(n).padStart(2, "0");
				const file = dailyNoteMap.get(`${y}-${pad(m + 1)}-${pad(d)}`);
				if (file) this.app.workspace.openLinkText(file.path, "", false);
			});

			const monthRow = gridRenderer.renderMonth(
				year,
				month,
				"date", // always date-aligned in dashboard strip (no weekday offset gaps)
				dailyNoteDates,
				this.settings.dailyNoteColor,
				this.settings.dailyNoteStyle,
			);

			const tagIconMap = new Map(Object.entries(this.settings.iconMap));
			barRenderer.render([monthRow], items, tagColorMap, tagIconMap);

			nowIndicator.cleanup();
			nowIndicator.render([monthRow], year);
			tooltip.attach(gridRenderer.getContainer());

			const grid = gridRenderer.getContainer();
			grid.style.width = "100%";

			// Trim empty trailing columns — date mode always renders 31, June only has 30
			const daysInMonth = new Date(year, month + 1, 0).getDate();
			const daysGridEl = grid.querySelector(".lc-days-grid") as HTMLElement | null;
			if (daysGridEl) {
				daysGridEl.style.gridTemplateColumns = `repeat(${daysInMonth}, 1fr)`;
			}
		};

		render();

		// Re-render when container width changes (e.g. DevTools closes, pane resizes)
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
			nowIndicator.cleanup();
			tooltip.cleanup();
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
