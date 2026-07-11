import { App } from "obsidian";
import type { TFile } from "obsidian";
import type { CalendarItem, ColumnMapping, PluginSettings, AlignMode } from "../types";
import type { DataSource } from "../data/DataSource";
import { buildTagColorMap } from "../utils/colorUtils";
import { GridRenderer } from "./GridRenderer";
import { BarRenderer } from "./BarRenderer";
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

interface CalendarRendererCallbacks {
	onDayDblClick?: (y: number, m: number, d: number) => void;
	onDayContextMenu?: (y: number, m: number, d: number, e: MouseEvent) => void;
	onCategoryToggle?: (tag: string) => void;
	onDropCommit?: (filePath: string, newStart: Date, newEnd: Date) => Promise<void>;
}

const pad = (n: number) => String(n).padStart(2, "0");

export class CalendarRenderer {
	private gridRenderer: GridRenderer;
	private barRenderer: BarRenderer;
	private nowIndicator: NowIndicator;
	private tooltip: Tooltip;
	private lastRenderedYear = new Date().getFullYear();
	private lastCategoriesSig: string | null = null;
	private current: RenderConfig | null = null;

	constructor(
		private app: App,
		container: HTMLElement,
		private categoriesEl: HTMLElement | null,
		private source: DataSource,
		private getMapping: () => ColumnMapping,
		private getSettings: () => PluginSettings,
		private callbacks: CalendarRendererCallbacks = {},
	) {
		this.gridRenderer = new GridRenderer(container);
		this.barRenderer = new BarRenderer(
			app,
			() => this.lastRenderedYear,
			callbacks.onDropCommit,
		);
		this.nowIndicator = new NowIndicator();
		// Anchor tooltip to container's parent to avoid overflow-x clipping
		this.tooltip = new Tooltip(container.parentElement ?? container);
	}

	render(config: RenderConfig): void {
		this.current = config;
		const { year, months, hiddenCategories, layout, alignMode, rowHeight, dailyNoteMap } = config;
		const { colorMap, iconMap, dailyNoteColor, dailyNoteStyle, japaneseWeekdayLabels } = this.getSettings();
		const dailyNoteDates = new Set(dailyNoteMap.keys());

		this.lastRenderedYear = year;
		const allItems = this.source.scan(this.getMapping(), year);
		const tagColorMap = buildTagColorMap(allItems, colorMap);

		if (this.categoriesEl) {
			this.renderCategories(allItems, year, months, tagColorMap, hiddenCategories);
		}

		const items = allItems.filter((item) => {
			const tag = item.tags?.[0];
			return tag ? !hiddenCategories.has(tag) : !hiddenCategories.has("__uncategorized__");
		});

		const monthRows = this.gridRenderer.render({
			year, months, layout, alignMode,
			dailyNoteDates, dailyNoteColor, dailyNoteStyle, japaneseWeekdayLabels,
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

		const tagIconMap = new Map(Object.entries(iconMap));
		this.barRenderer.render(monthRows, items, tagColorMap, tagIconMap);

		// NowIndicator manages its own interval lifecycle; only restarts on year change.
		this.nowIndicator.render(monthRows, year);

		this.tooltip.attach(this.gridRenderer.getContainer());

		if (months.length === 1) {
			const grid = this.gridRenderer.getContainer();
			const daysInMonth = new Date(year, months[0] + 1, 0).getDate();
			const daysGridEl = grid.querySelector<HTMLElement>(".lc-days-grid");
			if (daysGridEl) {
				daysGridEl.style.gridTemplateColumns = `repeat(${daysInMonth}, 1fr)`;
			}
			// Keep totalCols in sync with the actual grid so NowIndicator's
			// percentage-based left/width uses the right denominator.
			monthRows[0].totalCols = daysInMonth;
		}
	}

	/** Rebuild only bars and category chips using the config from the last render(); preserves the day-cell grid DOM. */
	renderBars(): void {
		const monthRows = this.gridRenderer.getMonthRows();
		if (!this.current || monthRows.length === 0) return;

		const { year, months, hiddenCategories } = this.current;
		const { colorMap, iconMap } = this.getSettings();

		const allItems = this.source.scan(this.getMapping(), year);
		const tagColorMap = buildTagColorMap(allItems, colorMap);

		if (this.categoriesEl) {
			this.renderCategories(allItems, year, months, tagColorMap, hiddenCategories);
		}

		const items = allItems.filter((item) => {
			const tag = item.tags?.[0];
			return tag ? !hiddenCategories.has(tag) : !hiddenCategories.has("__uncategorized__");
		});

		for (const rowRef of monthRows) {
			rowRef.barsContainer.empty();
		}

		const tagIconMap = new Map(Object.entries(iconMap));
		this.barRenderer.cleanup();
		this.barRenderer.render(monthRows, items, tagColorMap, tagIconMap);
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

	private renderCategories(
		allItems: CalendarItem[],
		year: number,
		months: number[],
		tagColorMap: Map<string, string>,
		hiddenCategories: Set<string>,
	): void {
		const el = this.categoriesEl!;

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

		const categories = new Map<string, number>();
		for (const item of countItems) {
			const tag = item.tags?.[0] ?? "__uncategorized__";
			categories.set(tag, (categories.get(tag) ?? 0) + 1);
		}

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
			const displayName = tag === "__uncategorized__"
				? "Other"
				: tag.replace(/^linear-calendar\//, "");
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
