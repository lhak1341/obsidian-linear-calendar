import { ItemView, Menu, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import { VIEW_TYPE_LINEAR_CALENDAR } from "../constants";
import { CreateEventModal } from "../CreateEventModal";
import { CalendarRenderer, type CalendarDeps, type RenderConfig } from "./CalendarRenderer";
import { applyFontRoles } from "@lhak/style/obsidian-helpers/font-roles";
import { restoreViewState, type ViewState } from "../utils/viewState";

/**
 * Public interface:
 *   getState()         — persists { year, hiddenCategories, rowHeight, layout } across reloads
 *   setState(s, r)     — restores persisted state, then re-renders
 *
 * Re-render triggers owned here: year nav (buttons, arrow keys), Today, layout toggle, setState.
 *   Item, daily-note and settings changes are CalendarRenderer's own subscriptions; the category
 *   toggle is its own too. Fonts are re-applied after every full render (afterRender), which is
 *   how a settings save reaches them.
 *
 * Lifecycle: onOpen builds DOM once; renderCalendar() syncs the toolbar and repaints the grid each call.
 *   onClose cleans up CalendarRenderer (subscriptions, NowIndicator timer, Tooltip listener).
 */
export class LinearCalendarView extends ItemView {
	private currentYear: number;
	/** Refilled in place by setState: CalendarRenderer holds this same set. */
	private readonly hiddenCategories = new Set<string>();
	private rowHeight = 0;
	private layout: "horizontal" | "vertical";
	private layoutToggleBtn!: HTMLElement;
	private yearLabelEl!: HTMLElement;
	private rowSlider: HTMLInputElement | null = null;
	private calendarRenderer!: CalendarRenderer;
	private categoriesContainer!: HTMLElement;

	constructor(leaf: WorkspaceLeaf, private deps: CalendarDeps) {
		super(leaf);
		this.currentYear = new Date().getFullYear();
		this.layout = window.innerWidth < 768 ? "vertical" : "horizontal";
	}

	getViewType(): string {
		return VIEW_TYPE_LINEAR_CALENDAR;
	}

	getDisplayText(): string {
		return "Linear calendar";
	}

	getIcon(): string {
		return "calendar-range";
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		// lk-root: the @lhak/style alias layer resolves its --lk- roles under this class.
		contentEl.addClass("linear-calendar-container", "lk-root");

		const toolbar = contentEl.createDiv({ cls: "linear-calendar-toolbar" });
		this.buildToolbar(toolbar);

		const scrollWrapper = contentEl.createDiv({ cls: "linear-calendar-scroll" });

		this.calendarRenderer = new CalendarRenderer(this.deps, {
			container: scrollWrapper,
			categoriesEl: this.categoriesContainer,
			config: () => this.renderConfig(),
			hiddenCategories: this.hiddenCategories,
			afterRender: () => this.applyFonts(),
			onDayDblClick: (y, m, d) => this.createNoteForDate(y, m, d),
			onDayContextMenu: (y, m, d, e) => this.showDayContextMenu(y, m, d, e),
		});

		this.registerDomEvent(scrollWrapper, "wheel", (evt: WheelEvent) => {
			if (evt.shiftKey && this.layout === "horizontal") {
				evt.preventDefault();
				scrollWrapper.scrollLeft += evt.deltaY;
			}
		});

		this.renderCalendar();

		window.requestAnimationFrame(() => this.scrollToNow());

		contentEl.tabIndex = 0;
		this.registerDomEvent(contentEl, "keydown", (evt: KeyboardEvent) => {
			this.handleKeydown(evt);
		});
	}

	async onClose(): Promise<void> {
		this.calendarRenderer.cleanup();
	}

	getState(): ViewState {
		return {
			year: this.currentYear,
			hiddenCategories: [...this.hiddenCategories],
			rowHeight: this.rowHeight,
			layout: this.layout,
		};
	}

	async setState(state: unknown, result: unknown): Promise<void> {
		const s = restoreViewState(state, this.getState());
		this.currentYear = s.year;
		this.hiddenCategories.clear();
		for (const category of s.hiddenCategories) this.hiddenCategories.add(category);
		this.rowHeight = s.rowHeight;
		this.layout = s.layout;
		if (this.calendarRenderer) this.renderCalendar();
		await super.setState(state, result as { history: boolean });
	}

	private buildToolbar(toolbar: HTMLElement): void {
		const nav = toolbar.createDiv({ cls: "lc-nav" });

		const prevBtn = nav.createEl("button", {
			cls: "lc-nav-btn clickable-icon",
			attr: { "aria-label": "Previous year" },
		});
		prevBtn.textContent = "‹";
		this.registerDomEvent(prevBtn, "click", () => {
			this.navigateYear(-1);
		});

		this.yearLabelEl = nav.createSpan({ cls: "lc-year-label" });

		const nextBtn = nav.createEl("button", {
			cls: "lc-nav-btn clickable-icon",
			attr: { "aria-label": "Next year" },
		});
		nextBtn.textContent = "›";
		this.registerDomEvent(nextBtn, "click", () => {
			this.navigateYear(1);
		});

		const todayBtn = toolbar.createEl("button", {
			cls: "lc-today-btn clickable-icon",
			text: "Today",
		});
		this.registerDomEvent(todayBtn, "click", () => {
			this.goToToday();
		});

		const densityWrap = toolbar.createDiv({ cls: "lc-density" });
		const slider = densityWrap.createEl("input", {
			cls: "lc-density-slider",
			attr: {
				type: "range",
				min: "0",
				max: "100",
				step: "1",
				"aria-label": "Row height",
			},
		});
		slider.value = String(this.rowHeight);
		this.rowSlider = slider;
		this.registerDomEvent(slider, "input", () => {
			this.rowHeight = Number((slider).value);
			this.calendarRenderer.updateRowHeight(this.rowHeight);
		});

		this.categoriesContainer = toolbar.createDiv({ cls: "lc-categories" });

		this.layoutToggleBtn = toolbar.createEl("button", {
			cls: "lc-layout-toggle clickable-icon",
		});
		this.registerDomEvent(this.layoutToggleBtn, "click", () => {
			this.layout = this.layout === "horizontal" ? "vertical" : "horizontal";
			this.renderCalendar();
			window.requestAnimationFrame(() => this.scrollToNow());
		});
	}

	/** Brings every toolbar control in line with the view state; `renderCalendar` runs it first, so no state path can skip it. */
	private syncChrome(): void {
		this.yearLabelEl.textContent = String(this.currentYear);
		if (this.rowSlider) this.rowSlider.value = String(this.rowHeight);
		this.updateLayoutToggleIcon();
	}

	private updateLayoutToggleIcon(): void {
		setIcon(this.layoutToggleBtn, this.layout === "horizontal" ? "chevrons-up-down" : "chevrons-left-right");
		this.layoutToggleBtn.setAttribute(
			"aria-label",
			this.layout === "horizontal" ? "Switch to vertical layout" : "Switch to horizontal layout",
		);
	}

	private navigateYear(delta: number): void {
		this.currentYear += delta;
		this.renderCalendar();
	}

	private goToToday(): void {
		this.currentYear = new Date().getFullYear();
		this.renderCalendar();
		this.scrollToNow();
	}

	private renderCalendar(): void {
		this.syncChrome();
		this.calendarRenderer.render();
	}

	/** Read by CalendarRenderer on every full render, so a settings save picks up a new align mode. */
	private renderConfig(): RenderConfig {
		return {
			range: { kind: "year", year: this.currentYear, layout: this.layout, alignMode: this.deps.getSettings().alignMode },
			rowHeight: this.rowHeight,
		};
	}

	private showDayContextMenu(year: number, month: number, day: number, event: MouseEvent): void {
		const menu = new Menu();
		const { dailyNotes, eventNotes, getSettings } = this.deps;
		if (!dailyNotes.get(year, month, day)) {
			menu.addItem((item) =>
				item.setTitle("Create daily note")
					.setIcon("file-plus")
					.onClick(async () => {
						try {
							const file = await dailyNotes.create(year, month, day);
							await this.app.workspace.openLinkText(file.path, "", false);
						} catch (err) {
							console.error("[linear-calendar] create daily note failed:", err);
							new Notice("Failed to create daily note.");
						}
					})
			);
		}
		menu.addItem((item) =>
			item.setTitle("Create event")
				.setIcon("calendar-plus")
				.onClick(() => new CreateEventModal(this.app, eventNotes, getSettings(), new Date(year, month, day)).open())
		);
		menu.showAtMouseEvent(event);
	}

	private applyFonts(): void {
		applyFontRoles(this.contentEl, this.deps.getSettings());
	}

	private handleKeydown(evt: KeyboardEvent): void {
		if (evt.target instanceof HTMLInputElement || evt.target instanceof HTMLTextAreaElement) return;

		switch (evt.key) {
			case "ArrowLeft":
				this.navigateYear(-1);
				evt.preventDefault();
				break;
			case "ArrowRight":
				this.navigateYear(1);
				evt.preventDefault();
				break;
			case "t":
			case "T":
				this.goToToday();
				evt.preventDefault();
				break;
		}
	}

	private createNoteForDate(year: number, month: number, day: number): void {
		void this.deps.eventNotes.create(new Date(year, month, day), { openAfterCreate: true });
	}

	private scrollToNow(): void {
		const todayEl = this.contentEl.querySelector(".lc-today-circle");
		todayEl?.scrollIntoView({ behavior: "smooth", block: "center" });
	}
}
