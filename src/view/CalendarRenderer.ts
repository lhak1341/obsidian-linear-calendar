import type { App } from "obsidian";
import type { PluginSettings } from "../types";
import type { DataSource } from "../data/DataSource";
import type { DailyNotes } from "../DailyNotes";
import type { EventNotes } from "../EventNotes";
import type { SettingsChanges } from "../SettingsChanges";
import { buildTagColorMap } from "../utils/colorUtils";
import { toggleCategory, visibleItems } from "../utils/category";
import { resolveRange, type ResolvedRange, type ViewRange } from "../utils/viewRange";
import { GridRenderer } from "./GridRenderer";
import type { RowRef } from "./GridRenderer";
import { BarRenderer } from "./BarRenderer";
import { createInteractions, type CalendarInteractions } from "./calendarInteractions";
import { subscribeRepaints } from "./calendarRepaints";
import { NowIndicator } from "./NowIndicator";
import { Tooltip } from "./Tooltip";
import { CategoryChips } from "./CategoryChips";

/** What a host shows; `CalendarHost.config` is read on every full render. */
export interface RenderConfig {
	range: ViewRange;
	/** Density slider value; see `updateRowHeight`. */
	rowHeight: number;
}

/** The plugin's shared collaborators: the same for every host. */
export interface CalendarDeps {
	app: App;
	source: DataSource;
	dailyNotes: DailyNotes;
	eventNotes: EventNotes;
	/** Read at call time — settings are mutable. */
	getSettings: () => PluginSettings;
	settingsChanges: SettingsChanges;
}

/** What one host supplies: where to draw, what to show, and its own extras. */
export interface CalendarHost {
	container: HTMLElement;
	categoriesEl: HTMLElement | null;
	config: () => RenderConfig;
	/** The host's set, so it can persist it; a chip click toggles it in place and repaints bars. */
	hiddenCategories: Set<string>;
	/** Runs after each full render, never after a bars-only repaint. */
	afterRender?: () => void;
	onDayDblClick?: (y: number, m: number, d: number) => void;
	onDayContextMenu?: (y: number, m: number, d: number, e: MouseEvent) => void;
}

interface CalendarRendererCallbacks extends CalendarInteractions {
	onDayDblClick?: (y: number, m: number, d: number) => void;
	onDayContextMenu?: (y: number, m: number, d: number, e: MouseEvent) => void;
}

/**
 * One calendar in one host. It keeps itself fresh: it subscribes to items, daily notes and settings
 * (`subscribeRepaints` decides how much each repaints), owns the category filter and the
 * note-mutating callbacks. A host calls `render()` after its own state changes (navigation,
 * layout, paging, resize) and `cleanup()` when it closes. Construction and resize policy stay
 * with each host (ADR-0001).
 */
export class CalendarRenderer {
	private gridRenderer: GridRenderer;
	private barRenderer: BarRenderer;
	private nowIndicator: NowIndicator;
	private tooltip: Tooltip;
	private categoryChips: CategoryChips | null;
	private current: ResolvedRange | null = null;
	private app: App;
	private source: DataSource;
	private dailyNotes: DailyNotes;
	private getSettings: () => PluginSettings;
	private callbacks: CalendarRendererCallbacks;
	private unsubscribe: () => void;

	constructor(deps: CalendarDeps, private host: CalendarHost) {
		this.app = deps.app;
		this.source = deps.source;
		this.dailyNotes = deps.dailyNotes;
		this.getSettings = deps.getSettings;
		this.callbacks = {
			onDayDblClick: host.onDayDblClick,
			onDayContextMenu: host.onDayContextMenu,
			...createInteractions({
				app: deps.app,
				eventNotes: deps.eventNotes,
				getSettings: deps.getSettings,
			}),
		};
		const { container, categoriesEl } = host;
		this.gridRenderer = new GridRenderer(container);
		this.barRenderer = new BarRenderer(deps.app, this.callbacks);
		this.nowIndicator = new NowIndicator();
		// Anchor tooltip to container's parent to avoid overflow-x clipping
		this.tooltip = new Tooltip(container.parentElement ?? container);
		this.categoryChips = categoriesEl
			? new CategoryChips(categoriesEl, this.tooltip, (tag) => {
				toggleCategory(host.hiddenCategories, tag);
				this.renderBars();
			})
			: null;
		this.unsubscribe = subscribeRepaints(
			{ items: deps.source, dailyNotes: deps.dailyNotes, settings: deps.settingsChanges },
			{ full: () => this.render(), bars: () => this.renderBars() },
		);
	}

	/** Full render from the host's current `config()`, then `afterRender`. */
	render(): void {
		const config = this.host.config();
		const range = resolveRange(config.range);
		this.current = range;
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

		this.host.afterRender?.();
	}

	/** Rebuild only bars and category chips for the last render()'s range; preserves the day-cell grid DOM. */
	private renderBars(): void {
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
		const range = this.current;
		const { hiddenCategories } = this.host;
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
		if (this.current?.layout === "vertical") {
			grid.style.setProperty("--lc-vert-row-h", `${20 + rowHeight * 0.4}px`);
		} else {
			grid.style.setProperty("--lc-row-min", `${rowHeight * 3}px`);
		}
	}

	cleanup(): void {
		this.unsubscribe();
		this.barRenderer.cleanup();
		this.nowIndicator.cleanup();
		this.tooltip.cleanup();
	}
}
