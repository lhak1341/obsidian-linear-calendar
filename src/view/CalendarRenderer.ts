import { App } from "obsidian";
import type { PluginSettings } from "../types";
import type { DataSource } from "../data/DataSource";
import type { DailyNotes } from "../DailyNotes";
import { buildTagColorMap } from "../utils/colorUtils";
import { visibleItems } from "../utils/category";
import { resolveRange, type ResolvedRange, type ViewRange } from "../utils/viewRange";
import { GridRenderer } from "./GridRenderer";
import type { RowRef } from "./GridRenderer";
import { BarRenderer } from "./BarRenderer";
import type { CalendarInteractions } from "./calendarInteractions";
import { NowIndicator } from "./NowIndicator";
import { Tooltip } from "./Tooltip";
import { CategoryChips } from "./CategoryChips";

export interface RenderConfig {
	range: ViewRange;
	hiddenCategories: Set<string>;
	/** Density slider value; see `updateRowHeight`. */
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
	private current: { range: ResolvedRange; hiddenCategories: Set<string> } | null = null;

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
		const range = resolveRange(config.range);
		this.current = { range, hiddenCategories: config.hiddenCategories };
		const { dailyNoteColor, dailyNoteStyle, japaneseWeekdayLabels } = this.getSettings();

		const rowRefs = this.gridRenderer.render({
			range,
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

		this.updateRowHeight(config.rowHeight);

		this.renderVisibleBars(rowRefs);

		this.nowIndicator.render(rowRefs, range);

		this.tooltip.attach(this.gridRenderer.getContainer(), this.barRenderer.getBarInfo.bind(this.barRenderer));
	}

	/** Rebuild only bars and category chips using the config from the last render(); preserves the day-cell grid DOM. */
	renderBars(): void {
		const rowRefs = this.gridRenderer.getRowRefs();
		if (!this.current || rowRefs.length === 0) return;

		for (const rowRef of rowRefs) {
			// Vertical layout reuses the month column (day cells included) as barsContainer — remove bars only.
			rowRef.barsContainer.querySelectorAll(":scope > .calendar-bar").forEach((el) => el.remove());
		}

		this.renderVisibleBars(rowRefs);
	}

	/**
	 * Scan the range's items, refresh category chips (they count everything the range covers),
	 * and (re)paint the visible bars into rowRefs — shared tail of render() and renderBars().
	 */
	private renderVisibleBars(rowRefs: RowRef[]): void {
		if (!this.current) return;
		const { range, hiddenCategories } = this.current;
		const { colorMap, iconMap, defaultMapping } = this.getSettings();

		const allItems = range.items((year) => this.source.scan(defaultMapping, year));
		const tagColorMap = buildTagColorMap(allItems, colorMap);
		this.categoryChips?.update(allItems, tagColorMap, hiddenCategories);

		const barLayout = range.layoutBars(visibleItems(allItems, hiddenCategories));
		const tagIconMap = new Map(Object.entries(iconMap));
		this.barRenderer.render(rowRefs, barLayout, tagColorMap, tagIconMap);
	}

	/**
	 * Applies a row height by setting one CSS variable, with no rebuild. The density slider
	 * calls this on every input event, so folding it into render() would rebuild every day cell per tick.
	 */
	updateRowHeight(rowHeight: number): void {
		const grid = this.gridRenderer.getContainer();
		if (this.current?.range.layout === "vertical") {
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
}
