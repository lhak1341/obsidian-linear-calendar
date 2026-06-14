import { App } from "obsidian";
import type { TFile } from "obsidian";
import type { CalendarItem, PluginSettings, ColumnMapping, AlignMode } from "../types";
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

export class CalendarRenderer {
	private gridRenderer: GridRenderer;
	private barRenderer: BarRenderer;
	private nowIndicator: NowIndicator;
	private tooltip: Tooltip;
	private lastRenderedYear = new Date().getFullYear();

	constructor(
		private app: App,
		container: HTMLElement,
		private categoriesEl: HTMLElement | null,
		private source: DataSource,
		private settings: PluginSettings,
		private getMapping: () => ColumnMapping,
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
		const { year, months, hiddenCategories, layout, alignMode, rowHeight, dailyNoteMap } = config;
		const dailyNoteDates = new Set(dailyNoteMap.keys());

		this.lastRenderedYear = year;
		const allItems = this.source.scan(this.getMapping(), year);
		const tagColorMap = buildTagColorMap(allItems, this.settings);

		if (this.categoriesEl) {
			this.renderCategories(allItems, year, months, tagColorMap, hiddenCategories);
		}

		const items = allItems.filter((item) => {
			const tag = item.tags?.[0];
			return tag ? !hiddenCategories.has(tag) : !hiddenCategories.has("__uncategorized__");
		});

		const pad = (n: number) => String(n).padStart(2, "0");
		this.gridRenderer.setDayClickHandler((y, m, d) => {
			const file = dailyNoteMap.get(`${y}-${pad(m + 1)}-${pad(d)}`);
			if (file) this.app.workspace.openLinkText(file.path, "", false);
		});
		if (this.callbacks.onDayDblClick) {
			this.gridRenderer.setDayDblClickHandler(this.callbacks.onDayDblClick);
		}
		if (this.callbacks.onDayContextMenu) {
			this.gridRenderer.setDayContextMenuHandler(this.callbacks.onDayContextMenu);
		}

		let monthRows;
		if (months.length === 1) {
			monthRows = [this.gridRenderer.renderMonth(
				year, months[0], alignMode, dailyNoteDates,
				this.settings.dailyNoteColor, this.settings.dailyNoteStyle,
			)];
		} else if (layout === "vertical") {
			monthRows = this.gridRenderer.renderVertical(
				year, dailyNoteDates, this.settings.dailyNoteColor,
				this.settings.dailyNoteStyle, alignMode,
			);
		} else {
			monthRows = this.gridRenderer.render(
				year, 0, alignMode, dailyNoteDates,
				this.settings.dailyNoteColor, this.settings.dailyNoteStyle,
			);
		}

		this.updateRowHeight(layout, rowHeight);

		const tagIconMap = new Map(Object.entries(this.settings.iconMap));
		this.barRenderer.render(monthRows, items, tagColorMap, tagIconMap);

		this.nowIndicator.cleanup();
		this.nowIndicator.render(monthRows, year);

		this.tooltip.attach(this.gridRenderer.getContainer());

		if (months.length === 1) {
			const grid = this.gridRenderer.getContainer();
			grid.style.width = "100%";
			const daysInMonth = new Date(year, months[0] + 1, 0).getDate();
			const daysGridEl = grid.querySelector(".lc-days-grid") as HTMLElement | null;
			if (daysGridEl) {
				daysGridEl.style.gridTemplateColumns = `repeat(${daysInMonth}, 1fr)`;
			}
		}
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
		el.empty();

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

		if (categories.size <= 1) return;

		for (const [tag, count] of categories) {
			const isHidden = hiddenCategories.has(tag);
			const displayName = tag === "__uncategorized__"
				? "Other"
				: tag.replace(/^linear-calendar\//, "");
			const color = tagColorMap.get(tag) ?? "#888";

			const chip = el.createDiv({
				cls: `lc-category-chip${isHidden ? " lc-category-hidden" : ""}`,
			});
			chip.createSpan({ cls: "lc-category-dot" }).style.backgroundColor = color;
			chip.createSpan({ cls: "lc-category-name", text: displayName });
			chip.createSpan({ cls: "lc-category-count", text: String(count) });

			chip.addEventListener("click", () => this.callbacks.onCategoryToggle?.(tag));
		}
	}
}
