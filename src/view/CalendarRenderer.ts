import { App } from "obsidian";
import type { CalendarItem, PluginSettings, AlignMode } from "../types";
import type { DataSource } from "../data/DataSource";
import type { DailyNotes } from "../DailyNotes";
import { buildTagColorMap } from "../utils/colorUtils";
import { visibleItems } from "../utils/category";
import { GridRenderer } from "./GridRenderer";
import type { MonthRowRef } from "./GridRenderer";
import { BarRenderer } from "./BarRenderer";
import type { CalendarInteractions } from "./calendarInteractions";
import { NowIndicator } from "./NowIndicator";
import { Tooltip } from "./Tooltip";
import { CategoryChips } from "./CategoryChips";

export interface RenderConfig {
	year: number;
	months: number[];
	hiddenCategories: Set<string>;
	layout: "horizontal" | "vertical";
	alignMode: AlignMode;
	rowHeight: number;
}

interface CalendarRendererCallbacks extends CalendarInteractions {
	onDayDblClick?: (y: number, m: number, d: number) => void;
	onDayContextMenu?: (y: number, m: number, d: number, e: MouseEvent) => void;
	onCategoryToggle?: (tag: string) => void;
}

export class CalendarRenderer {
	private gridRenderer: GridRenderer;
	private barRenderer: BarRenderer;
	private nowIndicator: NowIndicator;
	private tooltip: Tooltip;
	private categoryChips: CategoryChips | null;
	private current: RenderConfig | null = null;

	constructor(
		private app: App,
		container: HTMLElement,
		categoriesEl: HTMLElement | null,
		private source: DataSource,
		private dailyNotes: DailyNotes,
		private getSettings: () => PluginSettings,
		private callbacks: CalendarRendererCallbacks,
	) {
		this.gridRenderer = new GridRenderer(container);
		this.barRenderer = new BarRenderer(app, callbacks);
		this.nowIndicator = new NowIndicator();
		// Anchor tooltip to container's parent to avoid overflow-x clipping
		this.tooltip = new Tooltip(container.parentElement ?? container);
		this.categoryChips = categoriesEl ? new CategoryChips(categoriesEl, this.tooltip, callbacks.onCategoryToggle) : null;
	}

	render(config: RenderConfig): void {
		this.current = config;
		const { year, months, layout, alignMode, rowHeight } = config;
		const { dailyNoteColor, dailyNoteStyle, japaneseWeekdayLabels } = this.getSettings();

		const monthRows = this.gridRenderer.render({
			year, months, layout, alignMode,
			dailyNoteAt: (y, m, d) => this.dailyNotes.get(y, m, d), dailyNoteColor, dailyNoteStyle, japaneseWeekdayLabels,
			callbacks: {
				onDayClick: (y, m, d) => {
					const file = this.dailyNotes.get(y, m, d);
					if (file) void this.app.workspace.openLinkText(file.path, "", false);
				},
				onDayDblClick: this.callbacks.onDayDblClick,
				onDayContextMenu: this.callbacks.onDayContextMenu,
			},
		});

		this.updateRowHeight(layout, rowHeight);

		this.renderVisibleBars(config, monthRows);

		// NowIndicator manages its own interval lifecycle; only restarts on year change.
		this.nowIndicator.render(monthRows, year);

		this.tooltip.attach(this.gridRenderer.getContainer(), this.barRenderer.getBarInfo.bind(this.barRenderer));
	}

	/** Rebuild only bars and category chips using the config from the last render(); preserves the day-cell grid DOM. */
	renderBars(): void {
		const config = this.current;
		const monthRows = this.gridRenderer.getMonthRows();
		if (!config || monthRows.length === 0) return;

		for (const rowRef of monthRows) {
			// Vertical layout reuses the month column (day cells included) as barsContainer — remove bars only.
			rowRef.barsContainer.querySelectorAll(":scope > .calendar-bar").forEach((el) => el.remove());
		}

		this.renderVisibleBars(config, monthRows);
	}

	/** Compute visible items, refresh category chips, and (re)paint bars into monthRows — shared tail of render() and renderBars(). */
	private renderVisibleBars(config: RenderConfig, monthRows: MonthRowRef[]): void {
		const { year, months, hiddenCategories } = config;
		const { colorMap, iconMap } = this.getSettings();

		const { allItems, items, tagColorMap } = this.computeVisibleItems(year, hiddenCategories, colorMap);
		this.categoryChips?.update(allItems, year, months, tagColorMap, hiddenCategories);

		const tagIconMap = new Map(Object.entries(iconMap));
		this.barRenderer.render(monthRows, items, year, tagColorMap, tagIconMap);
	}

	/**
	 * Applies a row height by setting one CSS variable, with no rebuild. The density slider
	 * calls this on every input event, so folding it into render() would rebuild every day cell per tick.
	 */
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
		hiddenCategories: Set<string>,
		colorMap: Record<string, string>,
	): { allItems: CalendarItem[]; items: CalendarItem[]; tagColorMap: Map<string, string> } {
		const allItems = this.source.scan(this.getSettings().defaultMapping, year);
		const tagColorMap = buildTagColorMap(allItems, colorMap);

		const items = visibleItems(allItems, hiddenCategories);

		return { allItems, items, tagColorMap };
	}
}
