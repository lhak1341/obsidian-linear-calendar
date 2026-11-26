import { dayAt, windowEnd, type DayWindow } from "../utils/viewRange";
import { CalendarRenderer, type CalendarDeps, type RenderConfig } from "./CalendarRenderer";

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

const WINDOW_DAYS = 30;
/** How often to look for midnight. A host can stay open for days, and nothing else repaints an idle strip. */
const ROLLOVER_CHECK_MS = 60_000;

/**
 * Rolling 30-day calendar host for cross-plugin embeds (`obsidian-lhak-dashboard`). A sibling of
 * `LinearCalendarView`: it builds its own `CalendarRenderer` and owns its own resize policy (ADR-0001).
 * The window starts today and moves with the date; paging keeps its distance from today. Data and
 * settings repaints, and the category toggle, are the renderer's own.
 */
export class RollingStrip implements RollingStripHandle {
	private pageOffset = 0;
	private renderedDay = "";
	private shown!: DayWindow;
	private renderer: CalendarRenderer;
	private resizeObserver: ResizeObserver;
	private rolloverTimer: number;

	/**
	 * `onRangeChange` fires after every full render (mount, paging, midnight, resize, a daily-note
	 * or settings change), not after an item change or a category toggle: those repaint bars only
	 * and cannot move the window.
	 */
	constructor(
		deps: CalendarDeps,
		private container: HTMLElement,
		categoriesEl: HTMLElement,
		private onRangeChange?: (start: Date, end: Date) => void,
	) {
		// Embedded mode: styles.src.css lays the strip out to the host's width under this class.
		container.addClass("lc-embedded");
		this.renderer = new CalendarRenderer(deps, {
			container,
			categoriesEl,
			config: () => this.renderConfig(),
			hiddenCategories: new Set<string>(),
			afterRender: () => this.onRangeChange?.(this.shown.start, windowEnd(this.shown)),
		});

		this.render();

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
		this.renderer.cleanup();
		this.resizeObserver.disconnect();
		this.container.removeClass("lc-embedded");
	}

	private render(): void {
		this.renderer.render();
	}

	/** Read by the renderer on every full render; records the window it drew for `afterRender` and the midnight check. */
	private renderConfig(): RenderConfig {
		const now = new Date();
		this.renderedDay = now.toDateString();
		this.shown = { start: dayAt(now, this.pageOffset), days: WINDOW_DAYS };
		return { range: { kind: "window", ...this.shown }, rowHeight: 0 };
	}
}
