import type { App } from "obsidian";
import type { PluginSettings } from "../types";
import type { DataSource } from "../data/DataSource";
import type { DailyNotes } from "../DailyNotes";
import type { EventNotes } from "../EventNotes";
import { toggleCategory } from "../utils/category";
import { shiftMonth } from "../utils/dateUtils";
import { CalendarRenderer, RenderConfig } from "./CalendarRenderer";
import { createInteractions } from "./calendarInteractions";

/** Handle returned by {@link LinearCalendarPlugin.mountMonthStrip} for host-driven month navigation. */
export interface MonthStripHandle {
	next(): void;
	prev(): void;
	today(): void;
	destroy(): void;
}

export interface MonthStripDeps {
	app: App;
	scanner: DataSource;
	dailyNotes: DailyNotes;
	eventNotes: EventNotes;
	getSettings: () => PluginSettings;
}

/**
 * Single-month calendar host for cross-plugin embeds (`obsidian-lhak-dashboard`). A sibling of
 * `LinearCalendarView`: it builds its own `CalendarRenderer` and owns its own resize policy (ADR-0001).
 */
export class MonthStrip implements MonthStripHandle {
	private year = new Date().getFullYear();
	private month = new Date().getMonth();
	private hiddenCategories = new Set<string>();
	private renderer: CalendarRenderer;
	private unsubscribeItems: () => void;
	private unsubscribeDailyNotes: () => void;
	private resizeObserver: ResizeObserver;

	/** `onMonthChange` fires after every render (mount, navigation, data or resize), not only on navigation. */
	constructor(
		deps: MonthStripDeps,
		private container: HTMLElement,
		categoriesEl: HTMLElement,
		private onMonthChange?: (year: number, month: number) => void,
	) {
		const interactions = createInteractions({
			app: deps.app,
			eventNotes: deps.eventNotes,
			getSettings: deps.getSettings,
			rerender: () => this.render(),
		});

		this.renderer = new CalendarRenderer(
			deps.app,
			container,
			categoriesEl,
			deps.scanner,
			deps.dailyNotes,
			deps.getSettings,
			{
				onCategoryToggle: (tag) => {
					toggleCategory(this.hiddenCategories, tag);
					this.render();
				},
				...interactions,
			},
		);

		this.render();
		this.unsubscribeItems = deps.scanner.onChange(() => this.render());
		this.unsubscribeDailyNotes = deps.dailyNotes.onChange(() => this.render());

		let lastWidth = container.offsetWidth;
		this.resizeObserver = new ResizeObserver(() => {
			const w = container.offsetWidth;
			if (w !== lastWidth && w > 0) {
				lastWidth = w;
				this.render();
			}
		});
		this.resizeObserver.observe(container);
	}

	next(): void {
		this.shift(1);
	}

	prev(): void {
		this.shift(-1);
	}

	today(): void {
		this.year = new Date().getFullYear();
		this.month = new Date().getMonth();
		this.render();
	}

	destroy(): void {
		this.unsubscribeItems();
		this.unsubscribeDailyNotes();
		this.renderer.cleanup();
		this.resizeObserver.disconnect();
	}

	private shift(delta: number): void {
		({ year: this.year, month: this.month } = shiftMonth(this.year, this.month, delta));
		this.render();
	}

	private render(): void {
		const config: RenderConfig = {
			year: this.year,
			months: [this.month],
			hiddenCategories: this.hiddenCategories,
			layout: "horizontal",
			alignMode: "date",
			rowHeight: 0,
		};
		this.renderer.render(config);
		this.onMonthChange?.(this.year, this.month);
	}
}
