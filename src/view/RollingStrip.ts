import type { App } from "obsidian";
import type { PluginSettings } from "../types";
import type { DataSource } from "../data/DataSource";
import type { DailyNotes } from "../DailyNotes";
import type { EventNotes } from "../EventNotes";
import type { SettingsChanges } from "../SettingsChanges";
import { toggleCategory } from "../utils/category";
import { dayAt, windowEnd, type DayWindow } from "../utils/dayWindow";
import { CalendarRenderer, RenderConfig } from "./CalendarRenderer";
import { createInteractions } from "./calendarInteractions";

/** Handle returned by {@link LinearCalendarPlugin.mountRollingStrip} for host-driven paging. */
export interface RollingStripHandle {
	/** Show the next 30 days. */
	next(): void;
	/** Show the previous 30 days. */
	prev(): void;
	/** Back to the 30 days starting today. */
	today(): void;
	destroy(): void;
}

export interface RollingStripDeps {
	app: App;
	scanner: DataSource;
	dailyNotes: DailyNotes;
	eventNotes: EventNotes;
	getSettings: () => PluginSettings;
	settingsChanges: SettingsChanges;
}

const WINDOW_DAYS = 30;
/** How often to look for midnight. A host can stay open for days, and nothing else repaints an idle strip. */
const ROLLOVER_CHECK_MS = 60_000;

/**
 * Rolling 30-day calendar host for cross-plugin embeds (`obsidian-lhak-dashboard`). A sibling of
 * `LinearCalendarView`: it builds its own `CalendarRenderer` and owns its own resize policy (ADR-0001).
 * The window starts today and moves with the date; paging keeps its distance from today.
 */
export class RollingStrip implements RollingStripHandle {
	private pageOffset = 0;
	private renderedDay = "";
	private hiddenCategories = new Set<string>();
	private renderer: CalendarRenderer;
	private unsubscribeItems: () => void;
	private unsubscribeDailyNotes: () => void;
	private unsubscribeSettings: () => void;
	private resizeObserver: ResizeObserver;
	private rolloverTimer: number;

	/** `onRangeChange` fires after every render (mount, navigation, data, resize or midnight), not only on navigation. */
	constructor(
		deps: RollingStripDeps,
		private container: HTMLElement,
		categoriesEl: HTMLElement,
		private onRangeChange?: (start: Date, end: Date) => void,
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
		this.unsubscribeSettings = deps.settingsChanges.onChange(() => this.render());

		let lastWidth = container.offsetWidth;
		this.resizeObserver = new ResizeObserver(() => {
			const w = container.offsetWidth;
			if (w !== lastWidth && w > 0) {
				lastWidth = w;
				this.render();
			}
		});
		this.resizeObserver.observe(container);

		this.rolloverTimer = window.setInterval(() => {
			if (new Date().toDateString() !== this.renderedDay) this.render();
		}, ROLLOVER_CHECK_MS);
	}

	next(): void {
		this.pageOffset += WINDOW_DAYS;
		this.render();
	}

	prev(): void {
		this.pageOffset -= WINDOW_DAYS;
		this.render();
	}

	today(): void {
		this.pageOffset = 0;
		this.render();
	}

	destroy(): void {
		window.clearInterval(this.rolloverTimer);
		this.unsubscribeItems();
		this.unsubscribeDailyNotes();
		this.unsubscribeSettings();
		this.renderer.cleanup();
		this.resizeObserver.disconnect();
	}

	private render(): void {
		const now = new Date();
		this.renderedDay = now.toDateString();
		const window: DayWindow = { start: dayAt(now, this.pageOffset), days: WINDOW_DAYS };
		const config: RenderConfig = {
			year: window.start.getFullYear(),
			months: [],
			window,
			hiddenCategories: this.hiddenCategories,
			layout: "horizontal",
			alignMode: "date",
			rowHeight: 0,
		};
		this.renderer.render(config);
		this.onRangeChange?.(window.start, windowEnd(window));
	}
}
