import { App } from "obsidian";
import type { TFile } from "obsidian";
import type { CalendarItem, PluginSettings, AlignMode } from "../types";
import type { DataSource } from "../data/DataSource";
import { buildTagColorMap } from "../utils/colorUtils";
import { categoryLabel, countByCategory, visibleItems } from "../utils/category";
import { GridRenderer } from "./GridRenderer";
import type { MonthRowRef } from "./GridRenderer";
import { BarRenderer } from "./BarRenderer";
import type { CalendarInteractions } from "./calendarInteractions";
import { NowIndicator } from "./NowIndicator";
import { Tooltip } from "./Tooltip";

export interface RenderConfig {
	year: number;
	months: number[];
	hiddenCategories: Set<string>;
	layout: "horizontal" | "vertical";
	alignMode: AlignMode;
	rowHeight: number;
	dailyNoteMap: Map<string, TFile>;
}

interface CalendarRendererCallbacks extends CalendarInteractions {
	onDayDblClick?: (y: number, m: number, d: number) => void;
	onDayContextMenu?: (y: number, m: number, d: number, e: MouseEvent) => void;
	onCategoryToggle?: (tag: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

export class CalendarRenderer {
	private gridRenderer: GridRenderer;
	private barRenderer: BarRenderer;
	private nowIndicator: NowIndicator;
	private tooltip: Tooltip;
	private lastCategoriesSig: string | null = null;
	private current: RenderConfig | null = null;

	constructor(
		private app: App,
		container: HTMLElement,
		private categoriesEl: HTMLElement | null,
		private source: DataSource,
		private getSettings: () => PluginSettings,
		private callbacks: CalendarRendererCallbacks,
	) {
		this.gridRenderer = new GridRenderer(container);
		this.barRenderer = new BarRenderer(app, callbacks);
		this.nowIndicator = new NowIndicator();
		// Anchor tooltip to container's parent to avoid overflow-x clipping
		this.tooltip = new Tooltip(container.parentElement ?? container);
	}

	render(config: RenderConfig): void {
		this.current = config;
		const { year, months, layout, alignMode, rowHeight, dailyNoteMap } = config;
		const { dailyNoteColor, dailyNoteStyle, japaneseWeekdayLabels } = this.getSettings();

		const monthRows = this.gridRenderer.render({
			year, months, layout, alignMode,
			dailyNoteMap, dailyNoteColor, dailyNoteStyle, japaneseWeekdayLabels,
			callbacks: {
				onDayClick: (y, m, d) => {
					const file = dailyNoteMap.get(`${y}-${pad(m + 1)}-${pad(d)}`);
					if (file) void this.app.workspace.openLinkText(file.path, "", false);
				},
				onDayDblClick: this.callbacks.onDayDblClick,
				onDayContextMenu: this.callbacks.onDayContextMenu,
			},
		});

		this.updateRowHeight(layout, rowHeight);

		this.renderVisibleBars(monthRows);

		// NowIndicator manages its own interval lifecycle; only restarts on year change.
		this.nowIndicator.render(monthRows, year);

		this.tooltip.attach(this.gridRenderer.getContainer(), this.barRenderer.getBarInfo.bind(this.barRenderer));
	}

	/** Rebuild only bars and category chips using the config from the last render(); preserves the day-cell grid DOM. */
	renderBars(): void {
		const monthRows = this.gridRenderer.getMonthRows();
		if (!this.current || monthRows.length === 0) return;

		for (const rowRef of monthRows) {
			// Vertical layout reuses the month column (day cells included) as barsContainer — remove bars only.
			rowRef.barsContainer.querySelectorAll(":scope > .calendar-bar").forEach((el) => el.remove());
		}

		this.renderVisibleBars(monthRows);
	}

	/**
	 * Compute visible items, refresh category chips, and (re)paint bars into monthRows —
	 * shared tail of render() and renderBars(). Reads year/months/hiddenCategories off
	 * `this.current`, which both callers guarantee is set before this runs.
	 */
	private renderVisibleBars(monthRows: MonthRowRef[]): void {
		const { year, months, hiddenCategories } = this.current!;
		const { colorMap, iconMap } = this.getSettings();

		const { allItems, items, tagColorMap } = this.computeVisibleItems(year, months, hiddenCategories, colorMap);
		this.renderCategories(allItems, year, months, tagColorMap, hiddenCategories);

		const tagIconMap = new Map(Object.entries(iconMap));
		this.barRenderer.render(monthRows, items, year, tagColorMap, tagIconMap);
	}

	updateRowHeight(layout: "horizontal" | "vertical", rowHeight: number): void {
		const grid = this.gridRenderer.getContainer();
		if (layout === "vertical") {
			grid.style.setProperty("--lc-vert-row-h", `${20 + rowHeight * 0.4}px`);
		} else {
			grid.style.setProperty("--lc-row-min", `${rowHeight * 3}px`);
		}
	}

	cleanup(): void {
		this.barRenderer.cleanup();
		this.nowIndicator.cleanup();
		this.tooltip.cleanup();
	}

	/** Scan, resolve tag colors, and filter out hidden categories — shared by render() and renderBars(). No DOM writes. */
	private computeVisibleItems(
		year: number,
		months: number[],
		hiddenCategories: Set<string>,
		colorMap: Record<string, string>,
	): { allItems: CalendarItem[]; items: CalendarItem[]; tagColorMap: Map<string, string> } {
		const allItems = this.source.scan(this.getSettings().defaultMapping, year);
		const tagColorMap = buildTagColorMap(allItems, colorMap);

		const items = visibleItems(allItems, hiddenCategories);

		return { allItems, items, tagColorMap };
	}

	private renderCategories(
		allItems: CalendarItem[],
		year: number,
		months: number[],
		tagColorMap: Map<string, string>,
		hiddenCategories: Set<string>,
	): void {
		if (!this.categoriesEl) return;
		const el = this.categoriesEl;

		const countItems = months.length === 12
			? allItems
			: allItems.filter((item) => {
				for (const m of months) {
					const mStart = new Date(year, m, 1);
					const mEnd = new Date(year, m + 1, 0);
					if (item.dateStart <= mEnd && item.dateEnd >= mStart) return true;
				}
				return false;
			});

		const categories = countByCategory(countItems);

		if (categories.size <= 1) {
			if (this.lastCategoriesSig !== null) {
				el.empty();
				this.lastCategoriesSig = null;
			}
			return;
		}

		// Skip the DOM rebuild when categories, colors, and hidden state are all unchanged.
		const sig = [...categories.entries()]
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([k, v]) => `${k}:${v}:${tagColorMap.get(k) ?? ""}`)
			.join("|") + ";" + [...hiddenCategories].sort().join(",");
		if (sig === this.lastCategoriesSig) return;
		this.lastCategoriesSig = sig;

		el.empty();

		for (const [tag, count] of categories) {
			const isHidden = hiddenCategories.has(tag);
			const displayName = categoryLabel(tag);
			const color = tagColorMap.get(tag) ?? "#888";

			const chip = el.createDiv({
				cls: `lc-category-chip${isHidden ? " lc-category-hidden" : ""}`,
			});
			chip.addEventListener("mouseenter", (evt) => {
				const nameEl = chip.querySelector<HTMLElement>(".lc-category-name");
				if (nameEl && getComputedStyle(nameEl).display !== "none") return;
				this.tooltip.showForChip(displayName, evt);
			});
			chip.addEventListener("mouseleave", () => this.tooltip.hide());
			chip.createSpan({ cls: "lc-category-dot" }).style.backgroundColor = color;
			chip.createSpan({ cls: "lc-category-name", text: displayName });
			chip.createSpan({ cls: "lc-category-count", text: String(count) });

			chip.addEventListener("click", () => this.callbacks.onCategoryToggle?.(tag));
		}
	}
}
