import { ItemView, Menu, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import type { PluginSettings } from "../types";
import { VIEW_TYPE_LINEAR_CALENDAR } from "../constants";
import type { DataSource } from "../data/DataSource";
import type { EventNotes } from "../EventNotes";
import type { DailyNotes } from "../DailyNotes";
import { CreateEventModal } from "../CreateEventModal";
import { CalendarRenderer, RenderConfig } from "./CalendarRenderer";
import { createInteractions } from "./calendarInteractions";
import { resolveFontVar } from "../utils/fonts";
import { toggleCategory } from "../utils/category";

interface ViewState {
	year: number;
	hiddenCategories: string[];
	rowHeight: number;
	layout: "horizontal" | "vertical";
}

/**
 * Public interface:
 *   refresh()          — force re-render (called by plugin after settings save)
 *   getState()         — persists { year, hiddenCategories, rowHeight, layout } across reloads
 *   setState(s, r)     — restores persisted state, then re-renders
 *
 * Re-render triggers: metadataCache changed for calendar files (debounced 300ms),
 *   vault create/delete/rename, year nav buttons, layout toggle.
 *
 * Lifecycle: onOpen builds DOM once; renderCalendar() clears and repaints the grid each call.
 *   onClose cleans up CalendarRenderer (NowIndicator timer, Tooltip listener).
 */
export class LinearCalendarView extends ItemView {
	private currentYear: number;
	private hiddenCategories: Set<string> = new Set();
	private rowHeight = 0;
	private layout: "horizontal" | "vertical";
	private layoutToggleBtn!: HTMLElement;
	private rowSlider: HTMLInputElement | null = null;
	private calendarRenderer!: CalendarRenderer;
	private settings: PluginSettings;
	private source: DataSource;
	private dailyNotes: DailyNotes;
	private eventNotes: EventNotes;
	private categoriesContainer!: HTMLElement;

	constructor(
		leaf: WorkspaceLeaf,
		settings: PluginSettings,
		source: DataSource,
		dailyNotes: DailyNotes,
		eventNotes: EventNotes,
	) {
		super(leaf);
		this.settings = settings;
		this.source = source;
		this.dailyNotes = dailyNotes;
		this.eventNotes = eventNotes;
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
		contentEl.addClass("linear-calendar-container");
		this.applyFonts();

		const toolbar = contentEl.createDiv({ cls: "linear-calendar-toolbar" });
		this.buildToolbar(toolbar);

		const scrollWrapper = contentEl.createDiv({ cls: "linear-calendar-scroll" });

		const interactions = createInteractions({
			app: this.app,
			eventNotes: this.eventNotes,
			getSettings: () => this.settings,
			rerender: () => this.renderBarsOnly(),
		});

		this.calendarRenderer = new CalendarRenderer(
			this.app,
			scrollWrapper,
			this.categoriesContainer,
			this.source,
			this.dailyNotes,
			() => this.settings,
			{
				onDayDblClick: (y, m, d) => this.createNoteForDate(y, m, d),
				onDayContextMenu: (y, m, d, e) => this.showDayContextMenu(y, m, d, e),
				onCategoryToggle: (tag) => {
					toggleCategory(this.hiddenCategories, tag);
					this.renderBarsOnly();
				},
				...interactions,
			},
		);

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

		this.register(this.source.onChange(() => this.renderCalendar()));
		this.register(this.dailyNotes.onChange(() => this.renderCalendar()));
	}

	async onClose(): Promise<void> {
		this.calendarRenderer.cleanup();
	}

	getState(): Record<string, unknown> {
		return {
			year: this.currentYear,
			hiddenCategories: [...this.hiddenCategories],
			rowHeight: this.rowHeight,
			layout: this.layout,
		};
	}

	async setState(state: unknown, result: unknown): Promise<void> {
		const s = state as Partial<ViewState> | undefined;
		if (s?.year) this.currentYear = s.year;
		if (s?.hiddenCategories) {
			this.hiddenCategories = new Set(s.hiddenCategories);
		}
		if (s?.rowHeight != null) this.rowHeight = s.rowHeight;
		if (s?.layout) this.layout = s.layout;
		if (this.calendarRenderer) {
			this.updateYearLabel();
			if (this.rowSlider) this.rowSlider.value = String(this.rowHeight);
			this.updateLayoutToggleIcon();
			this.renderCalendar();
		}
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

		nav.createSpan({
			cls: "lc-year-label",
			text: String(this.currentYear),
		}).dataset.role = "year-label";

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
			this.calendarRenderer.updateRowHeight(this.layout, this.rowHeight);
		});

		this.categoriesContainer = toolbar.createDiv({ cls: "lc-categories" });

		this.layoutToggleBtn = toolbar.createEl("button", {
			cls: "lc-layout-toggle clickable-icon",
		});
		this.updateLayoutToggleIcon();
		this.registerDomEvent(this.layoutToggleBtn, "click", () => {
			this.layout = this.layout === "horizontal" ? "vertical" : "horizontal";
			this.updateLayoutToggleIcon();
			this.renderCalendar();
			window.requestAnimationFrame(() => this.scrollToNow());
		});
	}

	private updateLayoutToggleIcon(): void {
		setIcon(this.layoutToggleBtn, this.layout === "horizontal" ? "chevrons-up-down" : "chevrons-left-right");
		this.layoutToggleBtn.setAttribute(
			"aria-label",
			this.layout === "horizontal" ? "Switch to vertical layout" : "Switch to horizontal layout",
		);
	}

	private updateYearLabel(): void {
		const label = this.contentEl.querySelector('[data-role="year-label"]');
		if (label) label.textContent = String(this.currentYear);
	}

	private navigateYear(delta: number): void {
		this.currentYear += delta;
		this.renderCalendar();
		this.updateYearLabel();
	}

	private goToToday(): void {
		this.currentYear = new Date().getFullYear();
		this.renderCalendar();
		this.updateYearLabel();
		this.scrollToNow();
	}

	private renderCalendar(): void {
		const config: RenderConfig = {
			year: this.currentYear,
			months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
			hiddenCategories: this.hiddenCategories,
			layout: this.layout,
			alignMode: this.settings.alignMode,
			rowHeight: this.rowHeight,
		};
		this.calendarRenderer.render(config);
	}

	private renderBarsOnly(): void {
		this.calendarRenderer.renderBars();
	}

	private showDayContextMenu(year: number, month: number, day: number, event: MouseEvent): void {
		const menu = new Menu();
		if (!this.dailyNotes.get(year, month, day)) {
			menu.addItem((item) =>
				item.setTitle("Create daily note")
					.setIcon("file-plus")
					.onClick(async () => {
						try {
							const file = await this.dailyNotes.create(year, month, day);
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
				.onClick(() => new CreateEventModal(this.app, this.eventNotes, this.settings, new Date(year, month, day)).open())
		);
		menu.showAtMouseEvent(event);
	}

	refresh(): void {
		this.applyFonts();
		this.renderCalendar();
	}

	private applyFonts(): void {
		const { fontHeading, fontHeadingCustom, fontBody, fontBodyCustom, fontMono, fontMonoCustom } = this.settings;
		const el = this.contentEl;
		const set = (prop: string, choice: typeof fontHeading, custom: string) => {
			const v = resolveFontVar(choice, custom);
			if (v) el.style.setProperty(prop, v);
			else   el.style.removeProperty(prop);
		};
		set("--lc-fh", fontHeading, fontHeadingCustom);
		set("--lc-fb", fontBody, fontBodyCustom);
		set("--lc-fm", fontMono, fontMonoCustom);
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
		void this.eventNotes.create(new Date(year, month, day), { openAfterCreate: true });
	}

	private scrollToNow(): void {
		const todayEl = this.contentEl.querySelector(".lc-today-circle");
		todayEl?.scrollIntoView({ behavior: "smooth", block: "center" });
	}
}
